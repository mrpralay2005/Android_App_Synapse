# Story Feature - Complete Implementation Guide

## Overview
This document explains the complete Instagram-style Story feature implementation, including both active stories and user profile navigation.

## Key Features Implemented

### 1. Story Upload & Management
- **Dedicated Upload Modal**: Full-screen story creation interface
- **Multiple Story Support**: Users can add multiple stories sequentially via the blue plus badge
- **Delete & Copy Link**: Functional three-dot menu in story viewer
- **Smart Duration**: Videos play for their actual duration (capped at 60s max)

### 2. Story Display Logic

#### Active Stories (Users WITH Stories)
- **Visual**: Colorful gradient ring (yellow to fuchsia)
- **Click Behavior**: Opens immersive story viewer
- **Display**: Max 5 visible at once
- **Navigation**: Animated arrow appears when >5 stories exist
- **Sliding**: Click arrow hides 2 from left, shows 2 from right

#### User Profiles (Users WITHOUT Stories)
- **Visual**: Grayscale profile picture with gray border
- **Click Behavior**: Opens user's profile view (same as clicking profile icon)
- **Display**: Max 10 users total (even if 100+ exist in database)
- **Navigation**: Same 5-visible + arrow sliding logic
- **Opacity**: Dimmed (70%) with hover effect (100%)

### 3. Story Viewer Features
- **Progress Bars**: Dynamic bars reflecting actual video duration
- **Volume Control**: Persistent mute/unmute button (z-index fixed)
- **Smooth Transitions**: Cross-fade animations between stories
- **Delete**: Trash icon in header
- **Copy Link**: Three-dot menu option
- **Auto-advance**: Moves to next story automatically

## Component Architecture

### FeedView.jsx
```javascript
<FeedView
    stories={[...]}           // Array of story objects
    onStoryClick={...}        // Opens story viewer
    onUserProfileClick={...}  // Opens profile view
    myStories={[...]}         // Current user's stories
/>
```

### StoriesSlider Component
- Handles both story types via `isStory` prop
- Implements sliding window logic (5 visible, shift by 2)
- Routes clicks based on story availability

### InstagramLayout.jsx
```javascript
onUserProfileClick={(user) => {
    setUserProfile(user);
    setView('profile');
}}
```

## Backend Integration (When Deploying)

### Current State (Local Development)
- Mock stories array (10 items) for testing
- Mock user profiles (10 items) for empty state

### Production Requirements

#### 1. Fetch Real Stories
Replace mock data in `InstagramLayout.jsx`:
```javascript
stories={[
    // Replace with API call:
    // const stories = await fetch('/api/stories/active');
]}
```

#### 2. Fetch Real Users (for empty state)
In `FeedView.jsx`, replace:
```javascript
Array(10).fill(null).map(...)
// With:
// const users = await fetch('/api/users/suggested?limit=10');
```

#### 3. Story Upload Endpoint
In `handleStoryUpload` (InstagramLayout.jsx):
```javascript
// Currently: setMyStories(prev => [...prev, newStory]);
// Replace with:
const response = await fetch('/api/stories/create', {
    method: 'POST',
    body: formData
});
```

#### 4. Story Data Structure
Expected backend response:
```javascript
{
    id: string,
    user: {
        username: string,
        profileImage: string
    },
    type: 'IMAGE' | 'VIDEO',
    mediaUrl: string,
    createdAt: Date
}
```

## Testing Checklist

### Local Testing
- [x] Upload story → See gradient ring with profile pic
- [x] Click "Add Story" badge → Upload another story
- [x] Click story circle → Opens viewer
- [x] Volume button → Mutes/unmutes without closing
- [x] Delete button → Removes story
- [x] Arrow button → Slides stories (when >5)
- [x] Empty state → Shows 10 user profiles
- [x] Click user profile → Opens profile view

### Production Testing
- [ ] Stories persist after refresh
- [ ] Real user data loads correctly
- [ ] Profile navigation works for all users
- [ ] Story viewer shows correct user's stories
- [ ] Delete removes from database
- [ ] Copy link generates shareable URL

## Important Notes

1. **Max 10 Users Rule**: Even if 100 users exist without stories, only 10 are shown (as requested)
2. **Gradient Ring**: Only appears for users WITH active stories
3. **Profile View**: Clicking users without stories opens their profile (same view as "My Profile")
4. **Story Viewer**: Only opens for users WITH active stories
5. **Arrow Logic**: Appears at 6+ items, hides 2/shows 2 on click

## File Locations
- `FeedView.jsx`: Story display & slider logic
- `InstagramLayout.jsx`: Parent container & handlers
- `StoryViewer.jsx`: Immersive story viewing experience
- `CreateStoryModal.jsx`: Story upload interface
