import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const WORKSPACE_PREFIX = "workspace://"

// API base URL for constructing absolute URLs
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7861'

function isWorkspaceImage(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(WORKSPACE_PREFIX)
}

export function parseWorkspaceImage(value?: string | null): { workspace: string; path: string } | null {
  if (!isWorkspaceImage(value)) return null
  const trimmed = value!.slice(WORKSPACE_PREFIX.length)
  const [encodedWorkspace, ...pathParts] = trimmed.split("/")
  if (!encodedWorkspace || pathParts.length === 0) return null
  return { workspace: decodeURIComponent(encodedWorkspace), path: pathParts.join("/") }
}

function buildWorkspaceUrl(workspace: string, path: string): string {
  const encodedWorkspace = encodeURIComponent(workspace)
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${API_BASE_URL}/api/workspaces/${encodedWorkspace}/${encodedPath}`
}

// Resolve image source for full-size or preview images
export function resolveImageSrc(value?: string | null, kind: "full" | "preview" = "full"): string | null {
  if (!value) return null
  if (value.startsWith("data:") || value.startsWith("http")) return value
  const workspaceInfo = parseWorkspaceImage(value)
  if (!workspaceInfo) return value
  
  // Extract category and genid from path
  const pathParts = workspaceInfo.path.split('/')
  if (pathParts.length >= 2 && ['candidates', 'commits', 'rejects'].includes(pathParts[0])) {
    const category = pathParts[0]
    const genid = pathParts[1]
    const asset = kind === "preview" ? "512.png" : "full.png"

    // Build path for new unified endpoint
    const assetPath = `${category}/${genid}/${asset}`
    return buildWorkspaceUrl(workspaceInfo.workspace, assetPath)
  }

  // Fallback to old structure (shouldn't happen with new code)
  return buildWorkspaceUrl(workspaceInfo.workspace, workspaceInfo.path)
}

// Get metadata for a generation
export function resolveMetaSrc(value?: string | null): string | null {
  if (!value) return null
  const workspaceInfo = parseWorkspaceImage(value)
  if (!workspaceInfo) return null

  // Extract category and genid from path
  const pathParts = workspaceInfo.path.split('/')
  if (pathParts.length >= 2 && ['candidates', 'commits', 'rejects'].includes(pathParts[0])) {
    const category = pathParts[0]
    const genid = pathParts[1]

    // Build path for new unified endpoint
    const assetPath = `${category}/${genid}/meta.json`
    return buildWorkspaceUrl(workspaceInfo.workspace, assetPath)
  }

  // Fallback to old structure (shouldn't happen with new code)
  return buildWorkspaceUrl(workspaceInfo.workspace, workspaceInfo.path)
}