import { useEffect, useState } from "react";
import UserFrame from "./UserFrame.component";
import { LucideIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import playService from "@/shared/services/playService";
import { useSocketStore } from "@/shared/stores/socketStore";

export interface ILeaderboard {
  user: {
    id: number;
    avatar: string;
    nickname: string;
  };
  score: number;
  answered_at: null | Date;
  type?: string;
  icon?: LucideIcon;
}

interface RankingUser {
  users: ILeaderboard[];
  max_player: number;
  host?: number;
  is_correct?: boolean;
}

export default function RankingBoard() {
  const { socket } = useSocketStore();
  const [leaderboardData, setLeaderboardData] = useState<RankingUser>({
    users: [],
    max_player: 0,
  });
  const { codeRoom } = useParams();

  const getRoomParticipants = async () => {
    if (!codeRoom) return;
    try {
      const { data } = await playService.roomParticipants(codeRoom);
      setLeaderboardData(data);
    } catch (error) {
      console.log({ error });
    }
  };

  useEffect(() => {
    socket?.on(`${codeRoom}-leave`, async () => {
      await getRoomParticipants();
    });

    socket?.on(codeRoom ?? "", async () => {
      await getRoomParticipants();
    });

    return () => {
      socket?.off(`${codeRoom}-leave`);
      socket?.off(codeRoom);
    };
  }, [socket]);
  const remain_number_of_available_players =
    leaderboardData.max_player - leaderboardData.users.length;
  return (
    <div className="bg-white rounded-[10px] overflow-hidden w-[var(--ranking-board-width)] h-full relative">
      <UserFrame
        Leaderboard={leaderboardData.users}
        max_player={leaderboardData.max_player}
        is_correct={false}
        host_id={-1}
        drawer_id={-1}
      />
      <div className="absolute w-[44px] h-[44px] text-[12px] font-bold text-gray-300 border-2 border-gray-300 rounded-full top-2 right-2 flexCenter">
        <span>{remain_number_of_available_players}</span>/
        <span>{leaderboardData.max_player}</span>
      </div>
    </div>
  );
}
