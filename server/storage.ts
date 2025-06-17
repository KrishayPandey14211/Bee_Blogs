import { 
  users, posts, likes, comments, bookmarks, follows, messages,
  type User, type Post, type Like, type Comment, type Bookmark, type Follow, type Message,
  type InsertUser, type InsertPost, type InsertLike, type InsertComment, 
  type InsertBookmark, type InsertFollow, type InsertMessage, type PostWithAuthor, type CommentWithAuthor,
  type UserProfile, type MessageWithSender, type Conversation
} from "@shared/schema";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, 'password'> & { password: string }): Promise<User>;
  getUserProfile(userId: number, currentUserId?: number): Promise<UserProfile | undefined>;
  
  // Post methods
  getPosts(limit?: number, offset?: number, userId?: number): Promise<PostWithAuthor[]>;
  getPost(id: number, userId?: number): Promise<PostWithAuthor | undefined>;
  getPostsByAuthor(authorId: number, userId?: number): Promise<PostWithAuthor[]>;
  getPostsByTag(tag: string, userId?: number): Promise<PostWithAuthor[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: number, authorId: number): Promise<boolean>;
  searchPosts(query: string, userId?: number): Promise<PostWithAuthor[]>;
  
  // Like methods
  likePost(userId: number, postId: number): Promise<Like>;
  unlikePost(userId: number, postId: number): Promise<boolean>;
  isPostLiked(userId: number, postId: number): Promise<boolean>;
  getPostLikeCount(postId: number): Promise<number>;
  
  // Comment methods
  getComments(postId: number): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number, userId: number): Promise<boolean>;
  getCommentCount(postId: number): Promise<number>;
  
  // Bookmark methods
  bookmarkPost(userId: number, postId: number): Promise<Bookmark>;
  unbookmarkPost(userId: number, postId: number): Promise<boolean>;
  isPostBookmarked(userId: number, postId: number): Promise<boolean>;
  getUserBookmarks(userId: number): Promise<PostWithAuthor[]>;
  
  // Follow methods
  followUser(followerId: number, followingId: number): Promise<Follow>;
  unfollowUser(followerId: number, followingId: number): Promise<boolean>;
  isUserFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  getFollowerCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;
  
  // Trending and discovery
  getTrendingTags(): Promise<{ tag: string; count: number }[]>;
  getSuggestedAuthors(userId: number, limit?: number): Promise<UserProfile[]>;
  
  // Message methods
  sendMessage(message: InsertMessage): Promise<Message>;
  getConversations(userId: number): Promise<Conversation[]>;
  getMessages(userId: number, otherUserId: number, limit?: number): Promise<MessageWithSender[]>;
  markMessagesAsRead(userId: number, otherUserId: number): Promise<boolean>;
  getUnreadMessageCount(userId: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private likes: Map<number, Like>;
  private comments: Map<number, Comment>;
  private bookmarks: Map<number, Bookmark>;
  private follows: Map<number, Follow>;
  private messages: Map<number, Message>;
  private currentId: { users: number; posts: number; likes: number; comments: number; bookmarks: number; follows: number; messages: number };

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.likes = new Map();
    this.comments = new Map();
    this.bookmarks = new Map();
    this.follows = new Map();
    this.messages = new Map();
    this.currentId = {
      users: 1,
      posts: 1,
      likes: 1,
      comments: 1,
      bookmarks: 1,
      follows: 1,
      messages: 1,
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(userData: Omit<InsertUser, 'password'> & { password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const id = this.currentId.users++;
    const user: User = {
      ...userData,
      id,
      password: hashedPassword,
      bio: userData.bio || null,
      avatar: userData.avatar || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getUserProfile(userId: number, currentUserId?: number): Promise<UserProfile | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const postCount = Array.from(this.posts.values()).filter(post => post.authorId === userId).length;
    const followerCount = await this.getFollowerCount(userId);
    const followingCount = await this.getFollowingCount(userId);
    const isFollowing = currentUserId ? await this.isUserFollowing(currentUserId, userId) : false;

    return {
      ...user,
      postCount,
      followerCount,
      followingCount,
      isFollowing,
    };
  }

  // Post methods
  async getPosts(limit = 10, offset = 0, userId?: number): Promise<PostWithAuthor[]> {
    const allPosts = Array.from(this.posts.values())
      .filter(post => post.published)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return Promise.all(allPosts.map(post => this.enrichPostWithAuthor(post, userId)));
  }

  async getPost(id: number, userId?: number): Promise<PostWithAuthor | undefined> {
    const post = this.posts.get(id);
    if (!post || !post.published) return undefined;
    return this.enrichPostWithAuthor(post, userId);
  }

  async getPostsByAuthor(authorId: number, userId?: number): Promise<PostWithAuthor[]> {
    const authorPosts = Array.from(this.posts.values())
      .filter(post => post.authorId === authorId && post.published)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.all(authorPosts.map(post => this.enrichPostWithAuthor(post, userId)));
  }

  async getPostsByTag(tag: string, userId?: number): Promise<PostWithAuthor[]> {
    const taggedPosts = Array.from(this.posts.values())
      .filter(post => post.published && post.tags?.includes(tag))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.all(taggedPosts.map(post => this.enrichPostWithAuthor(post, userId)));
  }

  async createPost(postData: InsertPost): Promise<Post> {
    const id = this.currentId.posts++;
    const now = new Date();
    const post: Post = {
      title: postData.title,
      content: postData.content,
      excerpt: postData.excerpt,
      authorId: postData.authorId,
      id,
      image: postData.image || null,
      tags: postData.tags || null,
      published: postData.published ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: number, postData: Partial<InsertPost>): Promise<Post | undefined> {
    const existingPost = this.posts.get(id);
    if (!existingPost) return undefined;

    const updatedPost: Post = {
      ...existingPost,
      ...postData,
      updatedAt: new Date(),
    };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number, authorId: number): Promise<boolean> {
    const post = this.posts.get(id);
    if (!post || post.authorId !== authorId) return false;
    return this.posts.delete(id);
  }

  async searchPosts(query: string, userId?: number): Promise<PostWithAuthor[]> {
    const lowerQuery = query.toLowerCase();
    const matchingPosts = Array.from(this.posts.values())
      .filter(post => 
        post.published && (
          post.title.toLowerCase().includes(lowerQuery) ||
          post.content.toLowerCase().includes(lowerQuery) ||
          post.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        )
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.all(matchingPosts.map(post => this.enrichPostWithAuthor(post, userId)));
  }

  private async enrichPostWithAuthor(post: Post, userId?: number): Promise<PostWithAuthor> {
    const author = await this.getUser(post.authorId);
    const likeCount = await this.getPostLikeCount(post.id);
    const commentCount = await this.getCommentCount(post.id);
    const isLiked = userId ? await this.isPostLiked(userId, post.id) : false;
    const isBookmarked = userId ? await this.isPostBookmarked(userId, post.id) : false;

    return {
      ...post,
      author: author ? {
        id: author.id,
        displayName: author.displayName,
        username: author.username,
        avatar: author.avatar,
      } : {
        id: 0,
        displayName: 'Unknown User',
        username: 'unknown',
        avatar: null,
      },
      likeCount,
      commentCount,
      isLiked,
      isBookmarked,
    };
  }

  // Like methods
  async likePost(userId: number, postId: number): Promise<Like> {
    const existing = Array.from(this.likes.values()).find(
      like => like.userId === userId && like.postId === postId
    );
    if (existing) return existing;

    const id = this.currentId.likes++;
    const like: Like = {
      id,
      userId,
      postId,
      createdAt: new Date(),
    };
    this.likes.set(id, like);
    return like;
  }

  async unlikePost(userId: number, postId: number): Promise<boolean> {
    const like = Array.from(this.likes.entries()).find(
      ([_, like]) => like.userId === userId && like.postId === postId
    );
    if (!like) return false;
    return this.likes.delete(like[0]);
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    return Array.from(this.likes.values()).some(
      like => like.userId === userId && like.postId === postId
    );
  }

  async getPostLikeCount(postId: number): Promise<number> {
    return Array.from(this.likes.values()).filter(like => like.postId === postId).length;
  }

  // Comment methods
  async getComments(postId: number): Promise<CommentWithAuthor[]> {
    const postComments = Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return Promise.all(postComments.map(async comment => {
      const author = await this.getUser(comment.userId);
      return {
        ...comment,
        author: author ? {
          id: author.id,
          displayName: author.displayName,
          username: author.username,
          avatar: author.avatar,
        } : {
          id: 0,
          displayName: 'Unknown User',
          username: 'unknown',
          avatar: null,
        },
      };
    }));
  }

  async createComment(commentData: InsertComment): Promise<Comment> {
    const id = this.currentId.comments++;
    const comment: Comment = {
      ...commentData,
      id,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);
    return comment;
  }

  async deleteComment(id: number, userId: number): Promise<boolean> {
    const comment = this.comments.get(id);
    if (!comment || comment.userId !== userId) return false;
    return this.comments.delete(id);
  }

  async getCommentCount(postId: number): Promise<number> {
    return Array.from(this.comments.values()).filter(comment => comment.postId === postId).length;
  }

  // Bookmark methods
  async bookmarkPost(userId: number, postId: number): Promise<Bookmark> {
    const existing = Array.from(this.bookmarks.values()).find(
      bookmark => bookmark.userId === userId && bookmark.postId === postId
    );
    if (existing) return existing;

    const id = this.currentId.bookmarks++;
    const bookmark: Bookmark = {
      id,
      userId,
      postId,
      createdAt: new Date(),
    };
    this.bookmarks.set(id, bookmark);
    return bookmark;
  }

  async unbookmarkPost(userId: number, postId: number): Promise<boolean> {
    const bookmark = Array.from(this.bookmarks.entries()).find(
      ([_, bookmark]) => bookmark.userId === userId && bookmark.postId === postId
    );
    if (!bookmark) return false;
    return this.bookmarks.delete(bookmark[0]);
  }

  async isPostBookmarked(userId: number, postId: number): Promise<boolean> {
    return Array.from(this.bookmarks.values()).some(
      bookmark => bookmark.userId === userId && bookmark.postId === postId
    );
  }

  async getUserBookmarks(userId: number): Promise<PostWithAuthor[]> {
    const userBookmarks = Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const bookmarkedPosts = userBookmarks
      .map(bookmark => this.posts.get(bookmark.postId))
      .filter(Boolean) as Post[];

    return Promise.all(bookmarkedPosts.map(post => this.enrichPostWithAuthor(post, userId)));
  }

  // Follow methods
  async followUser(followerId: number, followingId: number): Promise<Follow> {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const existing = Array.from(this.follows.values()).find(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );
    if (existing) return existing;

    const id = this.currentId.follows++;
    const follow: Follow = {
      id,
      followerId,
      followingId,
      createdAt: new Date(),
    };
    this.follows.set(id, follow);
    return follow;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    const follow = Array.from(this.follows.entries()).find(
      ([_, follow]) => follow.followerId === followerId && follow.followingId === followingId
    );
    if (!follow) return false;
    return this.follows.delete(follow[0]);
  }

  async isUserFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );
  }

  async getFollowers(userId: number): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(follow => follow.followingId === userId)
      .map(follow => follow.followerId);

    return followerIds
      .map(id => this.users.get(id))
      .filter(Boolean) as User[];
  }

  async getFollowing(userId: number): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);

    return followingIds
      .map(id => this.users.get(id))
      .filter(Boolean) as User[];
  }

  async getFollowerCount(userId: number): Promise<number> {
    return Array.from(this.follows.values()).filter(follow => follow.followingId === userId).length;
  }

  async getFollowingCount(userId: number): Promise<number> {
    return Array.from(this.follows.values()).filter(follow => follow.followerId === userId).length;
  }

  // Trending and discovery
  async getTrendingTags(): Promise<{ tag: string; count: number }[]> {
    const tagCounts = new Map<string, number>();
    
    Array.from(this.posts.values()).forEach(post => {
      if (post.published && post.tags) {
        post.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getSuggestedAuthors(userId: number, limit = 5): Promise<UserProfile[]> {
    const allUsers = Array.from(this.users.values())
      .filter(user => user.id !== userId)
      .slice(0, limit);

    return Promise.all(allUsers.map(async user => {
      const profile = await this.getUserProfile(user.id, userId);
      return profile!;
    }));
  }

  // Message methods
  async sendMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.currentId.messages++;
    const message: Message = {
      id,
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      content: messageData.content,
      isRead: messageData.isRead ?? false,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getConversations(userId: number): Promise<Conversation[]> {
    const userMessages = Array.from(this.messages.values())
      .filter(msg => msg.senderId === userId || msg.receiverId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const conversationMap = new Map<number, { lastMessage: Message; unreadCount: number }>();

    for (const message of userMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      
      if (!conversationMap.has(otherUserId)) {
        const unreadCount = Array.from(this.messages.values())
          .filter(msg => 
            msg.senderId === otherUserId && 
            msg.receiverId === userId && 
            !msg.isRead
          ).length;

        conversationMap.set(otherUserId, {
          lastMessage: message,
          unreadCount,
        });
      }
    }

    const conversations: Conversation[] = [];
    for (const [otherUserId, { lastMessage, unreadCount }] of Array.from(conversationMap.entries())) {
      const participant = await this.getUser(otherUserId);
      if (participant) {
        conversations.push({
          participant: {
            id: participant.id,
            displayName: participant.displayName,
            username: participant.username,
            avatar: participant.avatar,
          },
          lastMessage,
          unreadCount,
        });
      }
    }

    return conversations.sort((a, b) => 
      b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
    );
  }

  async getMessages(userId: number, otherUserId: number, limit = 50): Promise<MessageWithSender[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => 
        (msg.senderId === userId && msg.receiverId === otherUserId) ||
        (msg.senderId === otherUserId && msg.receiverId === userId)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit);

    return Promise.all(conversationMessages.map(async message => {
      const sender = await this.getUser(message.senderId);
      return {
        ...message,
        sender: sender ? {
          id: sender.id,
          displayName: sender.displayName,
          username: sender.username,
          avatar: sender.avatar,
        } : {
          id: 0,
          displayName: 'Unknown User',
          username: 'unknown',
          avatar: null,
        },
      };
    }));
  }

  async markMessagesAsRead(userId: number, otherUserId: number): Promise<boolean> {
    const messagesToMark = Array.from(this.messages.entries())
      .filter(([_, msg]) => 
        msg.senderId === otherUserId && 
        msg.receiverId === userId && 
        !msg.isRead
      );

    messagesToMark.forEach(([id, msg]) => {
      this.messages.set(id, { ...msg, isRead: true });
    });

    return messagesToMark.length > 0;
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    return Array.from(this.messages.values())
      .filter(msg => msg.receiverId === userId && !msg.isRead)
      .length;
  }
}

export const storage = new MemStorage();
