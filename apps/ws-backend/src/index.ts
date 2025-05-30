import { WebSocketServer, WebSocket } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
const wss = new WebSocketServer({ port: 8080 });
import { prismaClient } from "@repo/db/client";

interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
}

const users: User[] = [];

function checkUser(token: string): string | null {
  //console.log("error check token = ", token);
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded == "string") {
    return null;
  }
  if (!decoded || !decoded.userId) {
    return null;
  }

  return decoded.userId;
}

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  //console.log("error check url = ", url);
  if (!url) {
    return;
  }
  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") ?? "";

  const userId = checkUser(token);
  //console.log("error user id = ", userId);
  if (userId == null) {
    ws.close();
    return null;
  }

  users.push({
    userId,
    rooms: [],
    ws,
  });

  ws.on("message", async function message(data) {
    const parsedData = JSON.parse(data.toString()); // parsing data as string
    //console.log("error check ", parsedData);
    if (parsedData.type === "join_room") {
      // checking weather the string is join_room
      const user = users.find((x) => x.ws === ws); // finding the user
      user?.rooms.push(parsedData.roomId); // if the user exist then pushing the room id to the rooms array
    }

    if (parsedData.type === "leave_room") {
      const user = users.find((x) => x.ws === ws);
      if (!user) {
        return;
      }
      user.rooms = user?.rooms.filter((x) => x === parsedData.room); //pop the user from the room usinf filter
    }

    if (parsedData.type === "chat") {
      // if the user want to chat
      const roomId = parsedData.roomId; // get the roomId where he to chat
      const message = parsedData.message; // get the messege what he want to send
      console.log(" check1");
      const chats = await prismaClient.chat.create({
        data: {
          roomId,
          message,
          userId,
        },
      });
      console.log(chats);
      console.log(" check2");
      users.forEach((user) => {
        // we need to send this messege to all the userr of the room so for each loop
        if (user.rooms.includes(roomId)) {
          // checks wather the users is in the room or not
          user.ws.send(
            // sends the messege
            JSON.stringify({
              type: "chat",
              message: message,
              roomId,
            })
          );
        }
      });
    }
  });

  // ws.on("message", function message(data) {
  //   try {
  //     const parsedData = JSON.parse(data.toString()); // Safely parse JSON

  //     console.log("Received data:", parsedData);

  //     if (!parsedData || typeof parsedData !== "object") {
  //       console.error("Invalid JSON structure:", parsedData);
  //       return;
  //     }

  //     if (parsedData.type === "join_room") {
  //       const user = users.find((x) => x.ws === ws);
  //       if (user && !user.rooms.includes(parsedData.roomId)) {
  //         user.rooms.push(parsedData.roomId);
  //       }
  //     }

  //     if (parsedData.type === "leave_room") {
  //       const user = users.find((x) => x.ws === ws);
  //       if (user) {
  //         user.rooms = user.rooms.filter((x) => x !== parsedData.roomId);
  //       }
  //     }

  //     if (parsedData.type === "chat") {
  //       const roomId = parsedData.roomId;
  //       const message = parsedData.message;

  //       users.forEach((user) => {
  //         if (user.rooms.includes(roomId)) {
  //           try {
  //             user.ws.send(JSON.stringify({ type: "chat", message, roomId }));
  //           } catch (error) {
  //             console.error("Failed to send message:", error);
  //           }
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Message processing error:", error);
  //   }
  // });
});
