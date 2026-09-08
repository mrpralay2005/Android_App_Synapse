import { Hono } from 'hono';
import {
    getFeed,
    createPost,
    getUploadUrl,
    toggleLike,
    addComment,
    toggleSave,
    getComments,
    getStories,
    createStory,
    deleteStory,
    viewStory,
    replyToStory,
    getStoryDetails
} from '../controllers/socialController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const social = new Hono();

// Public/Semi-public Feed
social.get('/feed', getFeed);
social.post('/upload-url', authenticateToken, getUploadUrl);

// Protected Interaction Routes
social.post('/posts', authenticateToken, createPost);
social.post('/posts/:id/like', authenticateToken, toggleLike);
social.post('/posts/:id/comment', authenticateToken, addComment);
social.get('/posts/:id/comments', getComments);
social.post('/posts/:id/save', authenticateToken, toggleSave);

// Story System
social.get('/stories', getStories);
social.post('/stories', authenticateToken, createStory);
social.delete('/stories/:id', authenticateToken, deleteStory);
social.post('/stories/:id/view', authenticateToken, viewStory);
social.post('/stories/:id/reply', authenticateToken, replyToStory);
social.get('/stories/:id/details', authenticateToken, getStoryDetails);

export default social;
