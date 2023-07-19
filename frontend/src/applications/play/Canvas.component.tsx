import {useContext } from "react";
import { PaintContext } from "@/applications/play/Play";
import cursorsIconMap from "./constants/cursorsIconMap";
// Functions
import {
  getPointFromEvent,
} from "@/applications/play/draw.helper";
import { useSocket} from "@/shared/hooks/useSocketEvents";
import { Point } from "./draw";

 const Canvas = () => {
  const variables = useContext(PaintContext);
  const {handleMouseDown, handleMouseMove, handleMouseUpOrLeave} = useSocket() as {
    handleMouseDown(point: Point): void;
    handleMouseMove(point: Point): void;
    handleMouseUpOrLeave(): void;
  }

  if (!variables) return null;
  const { canvasRef, penStyle } = variables;

  return (
    <div
      className={`relative overflow-hidden rounded-[10px] w-[760px] aspect-[2] flex-shrink-0`}
    >
      <canvas
          ref={canvasRef}
          id="canvas"
          className={`w-[var(--canvas-width)] h-[var(--canvas-height)] bg-white rounded-[10px] ${cursorsIconMap[penStyle] ?? ""
          }`}
          onMouseDown={(e) =>{
            const point = getPointFromEvent(e)
             handleMouseDown(point)
            }}
        onMouseMove={(e) =>{
          const currentPoint = getPointFromEvent(e)
           handleMouseMove(currentPoint)
          }}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        ></canvas>
    </div>
  );
}

export default Canvas