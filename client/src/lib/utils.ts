import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const WORKSPACE_PREFIX = "workspace://"

// API base URL for constructing absolute URLs
export const API_BASE_URL = 'http://localhost:7861'

export function isWorkspaceImage(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(WORKSPACE_PREFIX)
}

export function parseWorkspaceImage(value?: string | null): { workspace: string; path: string } | null {
  if (!isWorkspaceImage(value)) return null
  const trimmed = value!.slice(WORKSPACE_PREFIX.length)
  const [encodedWorkspace, ...pathParts] = trimmed.split("/")
  if (!encodedWorkspace || pathParts.length === 0) return null
  return { workspace: decodeURIComponent(encodedWorkspace), path: pathParts.join("/") }
}

export function buildWorkspaceUrl(workspace: string, path: string, kind: "images" | "previews" = "images"): string {
  const encodedWorkspace = encodeURIComponent(workspace)
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `${API_BASE_URL}/api/workspaces/${encodedWorkspace}/${kind}/${encodedPath}`
}

export function resolveImageSrc(value?: string | null, kind: "images" | "previews" = "images"): string | null {
  if (!value) return null
  if (value.startsWith("data:") || value.startsWith("http")) return value
  const workspaceInfo = parseWorkspaceImage(value)
  if (!workspaceInfo) return value
  return buildWorkspaceUrl(workspaceInfo.workspace, workspaceInfo.path, kind)
}