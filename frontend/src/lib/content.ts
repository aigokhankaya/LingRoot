import { API_BASE_URL, createHeaders, getToken, ApiResponse } from './api';

// Types
export interface Content {
  id: string;
  title: string;
  description?: string;
  content: string;
  type: string;
  level: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface ContentCreateParams {
  title: string;
  description?: string;
  content: string;
  type: string;
  level: string;
}

export interface ContentUpdateParams {
  title?: string;
  description?: string;
  content?: string;
  level?: string;
}

// Get all content
export const getAllContent = async (): Promise<ApiResponse<Content[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get content list');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get all content error:', error);
    throw error;
  }
};

// Get content by ID
export const getContentById = async (contentId: string): Promise<ApiResponse<Content>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/${contentId}`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get content error:', error);
    throw error;
  }
};

// Create new content
export const createContent = async (contentData: ContentCreateParams): Promise<ApiResponse<Content>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify(contentData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Create content error:', error);
    throw error;
  }
};

// Update content
export const updateContent = async (contentId: string, contentData: ContentUpdateParams): Promise<ApiResponse<Content>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/${contentId}`, {
      method: 'PUT',
      headers: createHeaders(),
      body: JSON.stringify(contentData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Update content error:', error);
    throw error;
  }
};

// Delete content
export const deleteContent = async (contentId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/${contentId}`, {
      method: 'DELETE',
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Delete content error:', error);
    throw error;
  }
};

// Get user's content
export const getUserContent = async (): Promise<ApiResponse<Content[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/user`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get user content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get user content error:', error);
    throw error;
  }
};

// Process text content
export const processTextContent = async (text: string, level: string, voice: string = 'default'): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/process-text`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({
        text,
        level,
        voice
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to process text');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Process text error:', error);
    throw error;
  }
};

// Process external link (YouTube, Spotify, etc.)
export const processExternalLink = async (url: string, type: string, level: string, voice: string = 'default'): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/process-link`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({
        url,
        type,
        level,
        voice
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to process ${type} link`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Process ${type} link error:`, error);
    throw error;
  }
};

// Get all content (admin only)
export const getAllContentAdmin = async (): Promise<ApiResponse<Content[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/content`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get all content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Get all content (admin) error:', error);
    throw error;
  }
};

// Delete content (admin only)
export const deleteContentAdmin = async (contentId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/content/${contentId}`, {
      method: 'DELETE',
      headers: createHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete content');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Delete content (admin) error:', error);
    throw error;
  }
};
