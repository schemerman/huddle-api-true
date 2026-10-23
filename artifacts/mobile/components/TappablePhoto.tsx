import React, { useState } from "react";
import { Image, Pressable, type ImageStyle, type StyleProp } from "react-native";
import { PhotoViewer } from "@/components/PhotoViewer";

// A photo in a post, reply or chat. Looks exactly as before; tapping it opens it full-screen.
export function TappablePhoto({ uri, style }: { uri: string; style?: StyleProp<ImageStyle> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Open photo full screen">
        <Image source={{ uri }} style={style} />
      </Pressable>
      <PhotoViewer uri={open ? uri : null} onClose={() => setOpen(false)} />
    </>
  );
}
