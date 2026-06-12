import { useState, useRef, useCallback, useEffect } from "react";

export function useDraggable(active = true) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Reset offset when dialog is closed/deactivated
  useEffect(() => {
    if (!active) {
      setOffset({ x: 0, y: 0 });
    }
  }, [active]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Do not drag if user is interacting with form elements, buttons, or links
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.tagName === "SELECT" ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select") ||
        target.closest("a")
      ) {
        return;
      }

      isDragging.current = true;
      dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };

      const handleMouseMove = (event: MouseEvent) => {
        if (!isDragging.current) {
          return;
        }
        setOffset({
          x: event.clientX - dragStart.current.x,
          y: event.clientY - dragStart.current.y,
        });
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [offset],
  );

  return {
    handleMouseDown,
    style: {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      cursor: "move",
    },
  };
}
