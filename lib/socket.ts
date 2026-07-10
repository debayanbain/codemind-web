import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

/** One shared Socket.io connection for the whole app — job pages join/leave rooms on it. */
export function getSocket(): Socket {
  socket ??= io(API_URL, { withCredentials: true, autoConnect: true });
  return socket;
}
