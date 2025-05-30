"use client";
import Image, { type ImageProps } from "next/image";
import { Button } from "@repo/ui/button";
import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();
  return (
    <div className={styles.page}>
      <input
        value={roomId}
        onChange={(e) => {
          setRoomId(e.target.value);
        }}
        type="text "
        placeholder="room Id"
      />
      <button
        onClick={() => {
          router.push(`/room/${roomId}`);
        }}
      >
        join room
      </button>
    </div>
  );
}
