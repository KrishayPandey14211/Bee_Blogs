import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import { 
  loginSchema, registerSchema, insertPostSchema, insertCommentSchema, insertMessageSchema,
  type User, type PostWithAuthor, type Conversation, type MessageWithSender 
} from "@shared/schema";
import { ZodError } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'blogsphere-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  }));

  // Helper middleware to require authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const user = await storage.createUser({
        email: data.email,
        username: data.username,
        password: data.password,
        displayName: data.displayName,
        bio: data.bio,
        avatar: data.avatar,
      });

      req.session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  // Post routes
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const tag = req.query.tag as string;
      const authorId = parseInt(req.query.authorId as string);
      const search = req.query.search as string;

      let posts: PostWithAuthor[];

      if (search) {
        posts = await storage.searchPosts(search, req.session.userId);
      } else if (tag) {
        posts = await storage.getPostsByTag(tag, req.session.userId);
      } else if (authorId) {
        posts = await storage.getPostsByAuthor(authorId, req.session.userId);
      } else {
        posts = await storage.getPosts(limit, offset, req.session.userId);
      }

      res.json({ posts });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getPost(id, req.session.userId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json({ post });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    try {
      const data = insertPostSchema.parse({
        ...req.body,
        authorId: req.session.userId,
      });

      const post = await storage.createPost(data);
      res.status(201).json({ post });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertPostSchema.partial().parse(req.body);

      const existingPost = await storage.getPost(id);
      if (!existingPost || existingPost.author.id !== req.session.userId) {
        return res.status(404).json({ message: "Post not found or not authorized" });
      }

      const updatedPost = await storage.updatePost(id, data);
      res.json({ post: updatedPost });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePost(id, req.session.userId!);
      
      if (!deleted) {
        return res.status(404).json({ message: "Post not found or not authorized" });
      }

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Like routes
  app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const like = await storage.likePost(req.session.userId!, postId);
      res.json({ like });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/posts/:id/like", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const unliked = await storage.unlikePost(req.session.userId!, postId);
      res.json({ success: unliked });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bookmark routes
  app.post("/api/posts/:id/bookmark", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const bookmark = await storage.bookmarkPost(req.session.userId!, postId);
      res.json({ bookmark });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/posts/:id/bookmark", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const unbookmarked = await storage.unbookmarkPost(req.session.userId!, postId);
      res.json({ success: unbookmarked });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/bookmarks", requireAuth, async (req, res) => {
    try {
      const bookmarks = await storage.getUserBookmarks(req.session.userId!);
      res.json({ posts: bookmarks });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Comment routes
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getComments(postId);
      res.json({ comments });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts/:id/comments", requireAuth, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const data = insertCommentSchema.parse({
        ...req.body,
        userId: req.session.userId,
        postId,
      });

      const comment = await storage.createComment(data);
      res.status(201).json({ comment });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User profile routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getUserProfile(id, req.session.userId);
      
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...profileWithoutPassword } = profile;
      res.json({ user: profileWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Follow routes
  app.post("/api/users/:id/follow", requireAuth, async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const follow = await storage.followUser(req.session.userId!, followingId);
      res.json({ follow });
    } catch (error: any) {
      if (error.message === "Cannot follow yourself") {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id/follow", requireAuth, async (req, res) => {
    try {
      const followingId = parseInt(req.params.id);
      const unfollowed = await storage.unfollowUser(req.session.userId!, followingId);
      res.json({ success: unfollowed });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Discovery routes
  app.get("/api/trending/tags", async (req, res) => {
    try {
      const tags = await storage.getTrendingTags();
      res.json({ tags });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/suggested/authors", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const authors = await storage.getSuggestedAuthors(req.session.userId!, limit);
      res.json({ authors });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Message routes
  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.session.userId!);
      res.json({ conversations });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getMessages(req.session.userId!, otherUserId, limit);
      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        senderId: req.session.userId,
      });

      const message = await storage.sendMessage(data);
      res.status(201).json({ message });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/messages/:userId/read", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const success = await storage.markMessagesAsRead(req.session.userId!, otherUserId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.session.userId!);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
