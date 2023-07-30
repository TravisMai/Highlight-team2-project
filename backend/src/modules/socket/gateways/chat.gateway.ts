import {
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { SocketGateway } from './socket.gateway';
import { expireTimeOneDay } from '../../../common/variables/constVariable';
import { extractIdRoom } from '../../../common/utils/helper';
import {
  CHAT_ROOM_CHANNEL,
  CHAT_ROOM_TYPE,
  GAME_STATUS,
  JOIN_ROOM_CHANNEL,
  JOIN_ROOM_CONTENT,
  JOIN_ROOM_TYPE,
  LEAVE_ROOM_CHANNEL,
  LEAVE_ROOM_CONTENT,
  LEAVE_ROOM_TYPE,
} from '../constant';
import { SocketClient } from '../socket.class';
import { Socket } from 'socket.io';
import { Chat } from '../types/chat';
import { MessageBodyType } from '../types/messageBody';
import { Room } from 'src/modules/room/room.entity';
import { errorsSocket } from 'src/common/errors/errorCode';

export class ChatGateway
  extends SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  async handleDisconnect(@ConnectedSocket() client: any) {
    try {
      const isBlock = await this.socketService.checkInBlockList(client);

      if (isBlock) {
        return;
      }

      this.socketService.removeClientDisconnection(client);

      const payload = await this.socketService.extractPayload(client);

      if (!payload) {
        this.logger.warn(`${client.id} invalid credential!`);
        return;
      }

      const user = await this.userService.getUserById(payload.id);

      if (user) {
        const codeRoom = await this.redisService.getObjectByKey(
          `USER:${user.id}:ROOM`,
        );

        let room: Room = await this.roomService.getRoomByCodeRoom(codeRoom);

        client.leave(codeRoom);

        const idRoom = extractIdRoom(codeRoom);
        await this.roomUserService.deleteRoomUser(idRoom, user.id);

        const ROOM_LEAVE = `${codeRoom}-leave`;

        this.server.in(codeRoom).emit(ROOM_LEAVE, {
          user: user.nickname,
          type: LEAVE_ROOM_TYPE,
          message: LEAVE_ROOM_CONTENT,
        });

        if (client.user.id === room.host_id) {
          room = await this.roomService.changeHost(codeRoom);
        }

        let roomRound = await this.roomRoundService.getRoundOfRoom(idRoom);
        if (roomRound && roomRound.painter === client.user.id) {
          const { endedAt, painterRound, startedAt, word } =
            await this.roomRoundService.initRoundInfomation(room);
          roomRound = await this.roomRoundService.updateRoomRound({
            ...roomRound,
            word,
            ended_at: endedAt,
            started_at: startedAt,
            painter: roomRound.next_painter,
            next_painter:
              [painterRound.next_painter, painterRound.painter].find(
                (painter) => painter !== roomRound.next_painter,
              ) ?? roomRound.painter,
          });
          await this.socketService.updateRoomRoundWhenDrawerOut(
            this.server,
            codeRoom,
            roomRound,
          );
        }

        await this.socketService.checkAndEmitToHostRoom(this.server, room);
        await this.socketService.sendListParticipantsInRoom(this.server, room);
        await this.redisService.deleteObjectByKey(`USER:${user.id}:ROOM`);
        await this.redisService.deleteObjectByKey(`USER:${user.id}:SOCKET`);
        await this.redisService.deleteObjectByKey(
          `USER:${user.id}:ACCESSTOKEN`,
        );
        await this.redisService.deleteObjectByKey(`${client.id}:ACCESSTOKEN`);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const isMultipleTab = await this.socketService.checkLoginMultipleTab(
        client,
      );

      if (isMultipleTab) {
        await this.redisService.setObjectByKeyValue(
          `BLOCKLIST:SOCKET:${client.id}`,
          client.id,
          expireTimeOneDay * 365,
        );
        this.socketService.sendError(client, errorsSocket.MULTIPLE_TAB);
        return;
      }

      this.socketService.storeClientConnection(client);
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage(JOIN_ROOM_CHANNEL)
  async handleJoinRoom(
    @MessageBody() codeRoom: string,
    @ConnectedSocket() client: SocketClient,
  ) {
    try {
      const idRoom: number = extractIdRoom(codeRoom);
      let room: Room = await this.roomService.getRoomByCodeRoom(codeRoom);

      if (!room) {
        this.socketService.sendError(client, errorsSocket.ROOM_NOT_FOUND);
        throw new WsException(errorsSocket.ROOM_NOT_FOUND);
      }

      const isAvailableRoom: boolean =
        await this.roomService.checkRoomAvailability(codeRoom);

      if (!isAvailableRoom) {
        this.socketService.sendError(client, errorsSocket.ROOM_FULL);
        throw new WsException(errorsSocket.ROOM_FULL);
      }

      const participant = await this.roomService.joinRoom(
        idRoom,
        client.user.id,
      );

      if (!participant) {
        this.socketService.sendError(client, errorsSocket.CAN_NOT_JOIN);
        throw new WsException(errorsSocket.CAN_NOT_JOIN);
      }

      await this.redisService.setObjectByKeyValue(
        `USER:${client.user.id}:ROOM`,
        codeRoom,
        expireTimeOneDay,
      );

      client.join(codeRoom);

      const chatContent: Chat = {
        user: client.user.nickname,
        type: JOIN_ROOM_TYPE,
        message: JOIN_ROOM_CONTENT,
      };

      room = await this.roomService.changeHost(codeRoom);

      this.server.in(codeRoom).emit(codeRoom, chatContent);
      await this.socketService.checkAndEmitToHostRoom(this.server, room);
      await this.socketService.sendListParticipantsInRoom(this.server, room);

      const roomStatus = this.roomService.getRoomStatus(room);
      this.server.to(client.id).emit(GAME_STATUS, roomStatus);
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage(CHAT_ROOM_CHANNEL)
  async handleMessageChatBox(
    @MessageBody() msgBody: MessageBodyType,
    @ConnectedSocket() client: SocketClient,
  ) {
    try {
      const ROOM_CHAT: string = `${msgBody.codeRoom}-chat`;

      const chatContent: Chat = {
        user: client.user.nickname,
        type: CHAT_ROOM_TYPE,
        message: msgBody.message,
      };

      this.server.in(msgBody.codeRoom).emit(ROOM_CHAT, chatContent);
    } catch (error) {
      this.logger.error(error);
    }
  }

  @SubscribeMessage(LEAVE_ROOM_CHANNEL)
  async handleLeaveRoom(
    @MessageBody() codeRoom: string,
    @ConnectedSocket() client: SocketClient,
  ) {
    try {
      let room: Room = await this.roomService.getRoomByCodeRoom(codeRoom);

      if (!room) {
        this.socketService.sendError(client, errorsSocket.ROOM_NOT_FOUND);
        throw new WsException(errorsSocket.ROOM_NOT_FOUND);
      }

      const chatContent: Chat = {
        user: client.user.nickname,
        type: LEAVE_ROOM_TYPE,
        message: LEAVE_ROOM_CONTENT,
      };

      const roomId = extractIdRoom(codeRoom);

      await Promise.all([
        this.redisService.deleteObjectByKey(`USER:${client.user.id}:ROOM`),
        this.roomUserService.deleteRoomUser(roomId, client.user.id),
      ]);

      client.to(codeRoom).emit(`${codeRoom}-leave`, chatContent);
      client.leave(codeRoom);

      if (client.user.id === room.host_id) {
        room = await this.roomService.changeHost(codeRoom);
      }

      await this.socketService.checkAndEmitToHostRoom(this.server, room);
      await this.socketService.sendListParticipantsInRoom(this.server, room);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
