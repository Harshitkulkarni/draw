import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import {
  CreateRoomSchema,
  CreateUserSchema,
  SigninSchema,
} from "@repo/common/types";

import { prismaClient } from "@repo/db/client";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());
app.post("/signup", async (req, res) => {
  try {
    // console.log(req.body);
    const parsedData: any = CreateUserSchema.safeParse(req.body);
    const hassedPassword = await bcrypt.hash(parsedData.data.password, 10);
    //console.log(hassedPassword);
    if (!parsedData.success) {
      res.json({
        message: "Incorrect inputs",
      });
      return;
    }
    const user = await prismaClient.user.create({
      data: {
        email: parsedData.data.email,
        password: hassedPassword,
        name: parsedData.data.name,
      },
    });
    res.status(200).json({
      message: "signup success",
      data: user,
    });
    // console.log("hi");
  } catch (error) {
    res.status(400).json({
      message: "email is already present",
    });
  }
});

app.post("/signin", async (req, res) => {
  try {
    const parsedData = SigninSchema.safeParse(req.body);
    //console.log(parsedData);
    if (!parsedData.success) {
      throw new Error("invalid inputs");
    }

    const user = await prismaClient.user.findFirst({
      where: {
        email: parsedData.data.email,
      },
    });
    //console.log(user);
    if (!user) {
      throw new Error("user does not exist");
    }

    const decodedPassword = await bcrypt.compare(
      parsedData.data.password,
      user?.password
    );
    //console.log("decoded : ", decodedPassword);
    if (!decodedPassword) {
      throw new Error("incorrecct password");
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET
    );

    res.json({ message: "loged in sucessful", token: token, data: user });
  } catch (error) {
    res.status(400).json({
      message: "something went wrong" + error,
    });
  }
});

app.post("/room", middleware, async (req, res) => {
  try {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
      throw new Error("invalid input");
    }
    //@ts-ignore
    const userId = req.userId;
    try {
      const room = await prismaClient.room.create({
        data: {
          slug: parsedData.data.name,
          adminId: userId,
        },
      });
      if (!room) {
        throw new Error("error in room creation ");
      }
      res.status(200).json({
        message: "room created sucessfully",
        data: room,
      });
    } catch (error: unknown) {
      if (error) {
        //@ts-ignore
        if (error.code === "P2002") {
          res.status(400).json({ message: "Room name must be unique" });
          return;
        }
      }

      res
        .status(500)
        .json({ message: "Internal server error", error: String(error) });
    }
  } catch (error) {
    res.status(400).json("cougth here");
  }
});

app.get("/chats/:roomId", async (req, res) => {
  const roomId = Number(req.params.roomId);
  console.log(roomId);
  try {
    const message = await prismaClient.chat.findMany({
      where: {
        roomId: roomId,
      },
      orderBy: {
        id: "desc",
      },
      take: 50,
    });
    res.json({
      message,
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/room/:slug", async (req, res) => {
  const slug = req.params.slug;
  //console.log(slug);
  const room = await prismaClient.room.findFirst({
    where: {
      slug,
    },
  });
  res.json({
    room,
  });
});

app.listen(3001);
