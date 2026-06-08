import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, postsTable, usersTable } from "@workspace/db";
import { ListPostsResponse, CreatePostBody, CreatePostResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/posts", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: postsTable.id,
      userId: postsTable.userId,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarColor: usersTable.avatarColor,
      text: postsTable.text,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.userId, usersTable.id))
    .orderBy(desc(postsTable.createdAt));

  const payload = rows.map((p) => ({
    id: p.id,
    userId: p.userId,
    username: p.username,
    displayName: p.displayName,
    avatarColor: p.avatarColor,
    text: p.text,
    createdAt: p.createdAt.toISOString(),
  }));

  res.json(ListPostsResponse.parse(payload));
});

router.post("/posts", async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  const [author] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, input.userId));

  if (!author) {
    res.status(404).json({ error: "Author not found" });
    return;
  }

  const [post] = await db
    .insert(postsTable)
    .values({
      id: randomUUID(),
      userId: input.userId,
      text: input.text,
    })
    .returning();

  res.json(
    CreatePostResponse.parse({
      id: post.id,
      userId: post.userId,
      username: author.username,
      displayName: author.displayName,
      avatarColor: author.avatarColor,
      text: post.text,
      createdAt: post.createdAt.toISOString(),
    }),
  );
});

export default router;
