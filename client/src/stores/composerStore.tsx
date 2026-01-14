import React, { createContext, useContext, useReducer, useEffect } from 'react'

// Types
interface ComposerState {
  activeProject: string
  projects: { [projectId: string]: { positive: any[], negative: any[] } }
}

// Actions
type ComposerAction =
  | { type: 'SET_ACTIVE_PROJECT'; payload: string }
  | { type: 'UPDATE_PROJECT_DATA'; payload: { projectId: string; target: 'positive' | 'negative'; nodes: any[] } }
  | { type: 'CREATE_PROJECT'; payload: string }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'LOAD_FROM_STORAGE' }

// Reducer
const composerReducer = (state: ComposerState, action: ComposerAction): ComposerState => {
  switch (action.type) {
    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProject: action.payload }

    case 'UPDATE_PROJECT_DATA':
      return {
        ...state,
        projects: {
          ...state.projects,
          [action.payload.projectId]: {
            ...state.projects[action.payload.projectId],
            [action.payload.target]: action.payload.nodes
          }
        }
      }

    case 'CREATE_PROJECT':
      return {
        ...state,
        projects: {
          ...state.projects,
          [action.payload]: { positive: [], negative: [] }
        }
      }

    case 'DELETE_PROJECT':
      const newProjects = { ...state.projects }
      delete newProjects[action.payload]
      return { ...state, projects: newProjects }

    case 'LOAD_FROM_STORAGE':
      const stored = localStorage.getItem('composer-store')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return { ...state, projects: parsed.projects || state.projects }
        } catch (e) {
          console.warn('Failed to load composer data from storage:', e)
        }
      }
      return state

    default:
      return state
  }
}

// Initial state
const initialState: ComposerState = {
  activeProject: 'default',
  projects: {
    default: {
      positive: [],
      negative: []
    }
  }
}

// Context
const ComposerContext = createContext<{
  state: ComposerState
  dispatch: React.Dispatch<ComposerAction>
} | null>(null)

// Provider component
export const ComposerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(composerReducer, initialState)

  // Load from localStorage on mount
  useEffect(() => {
    dispatch({ type: 'LOAD_FROM_STORAGE' })
  }, [])

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('composer-store', JSON.stringify({ projects: state.projects }))
  }, [state.projects])

  return (
    <ComposerContext.Provider value={{ state, dispatch }}>
      {children}
    </ComposerContext.Provider>
  )
}

// Custom hook
export const useComposerStore = () => {
  const context = useContext(ComposerContext)
  if (!context) {
    throw new Error('useComposerStore must be used within a ComposerProvider')
  }

  const { state, dispatch } = context

  return {
    // State
    activeProject: state.activeProject,
    projects: state.projects,

    // Actions
    setActiveProject: (projectId: string) => dispatch({ type: 'SET_ACTIVE_PROJECT', payload: projectId }),

    getProjectData: (projectId: string) => {
      return state.projects[projectId] || { positive: [], negative: [] }
    },

    updateProjectData: (projectId: string, target: 'positive' | 'negative', nodes: any[]) => {
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { projectId, target, nodes } })
    },

    createProject: (projectId: string) => {
      dispatch({ type: 'CREATE_PROJECT', payload: projectId })
    },

    deleteProject: (projectId: string) => {
      dispatch({ type: 'DELETE_PROJECT', payload: projectId })
    },

    // Helper methods for current active project
    getCurrentProjectData: () => {
      return state.projects[state.activeProject] || { positive: [], negative: [] }
    },

    updateCurrentProjectData: (target: 'positive' | 'negative', nodes: any[]) => {
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { projectId: state.activeProject, target, nodes } })
    },

    // Get data for a specific target in current project
    getCurrentTargetData: (target: 'positive' | 'negative') => {
      const projectData = state.projects[state.activeProject] || { positive: [], negative: [] }
      return projectData[target] || []
    },

    // Update data for a specific target in current project
    updateCurrentTargetData: (target: 'positive' | 'negative', nodes: any[]) => {
      dispatch({ type: 'UPDATE_PROJECT_DATA', payload: { projectId: state.activeProject, target, nodes } })
    }
  }
}

// Example usage for future tab system:
/*
  // Create a new project/tab
  const { createProject, setActiveProject } = useComposerStore()
  createProject('project-1')
  setActiveProject('project-1')

  // Switch tabs
  setActiveProject('project-2')

  // Each tab maintains its own composer state independently!
*/