import { io } from "socket.io-client";
const socket = io("http://127.0.0.1:3000", { transports: ['websocket'] });

socket.on("connect", () => {
    console.log("Connected to socket!");
});

socket.on("market-tick", (ticks) => {
    console.log("Received ticks at: ", new Date(), Object.keys(ticks).length);
    socket.disconnect();
});

setTimeout(() => {
    console.log("Timeout waiting for ticks");
    socket.disconnect();
}, 2000);
