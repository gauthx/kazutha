export function createRoomCodeGenerator(start = 1000) {
  let current = start;
  return () => current++;
}

export const generateRoomCode = createRoomCodeGenerator();
