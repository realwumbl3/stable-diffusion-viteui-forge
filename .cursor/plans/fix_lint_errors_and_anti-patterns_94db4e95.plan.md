---
name: Fix Lint Errors and Anti-patterns
overview: Systematically fix all 122 lint problems by categorizing them into quick fixes, TypeScript type improvements, strategically broken-down React Hooks refactoring phases, and code quality improvements.
todos:
  - id: phase1-quick-fixes
    content: "Phase 1: Auto-fix simple issues and remove unused imports/variables"
    status: completed
  - id: phase1-vite-config
    content: Fix vite.config.js process undefined issue
    status: completed
  - id: phase2-api-types
    content: "Phase 2: Replace any types in Api.ts with proper interfaces"
    status: completed
  - id: phase2-other-types
    content: Replace any types in other files (NodeComponent, NodeField, legacyEncoding, etc.)
    status: completed
  - id: phase3-1-variable-order
    content: "Phase 3.1: Fix variable accessed before declaration (useDrawing, TagComponent, WorkspaceBrowser)"
    status: completed
  - id: phase3-2-simple-setstate
    content: "Phase 3.2: Convert simple setState in effects to derived state (UpscaleDialog, useWorkspaceTabs, Sidebar)"
    status: completed
  - id: phase3-3-ref-to-state
    content: "Phase 3.3: Convert refs accessed during render to state (CanvasArea, InpaintCanvas, TagsNodeContent)"
    status: completed
  - id: phase3-4-complex-setstate
    content: "Phase 3.4: Refactor complex setState in effects (useCanvasState, OptionPicker, useWebSocketProgress)"
    status: completed
  - id: phase3-5-dependencies
    content: "Phase 3.5: Fix missing dependencies in hooks (24 warnings across multiple files)"
    status: completed
  - id: phase3-6-memoization
    content: "Phase 3.6: Fix preserve manual memoization issues (useCanvasState, PromptComposer)"
    status: completed
  - id: phase4-code-quality
    content: "Phase 4: Fix impure functions, code style issues (Math.random, case declarations, hasOwnProperty)"
    status: pending
isProject: false
---

# Fix Lint Errors and Anti-patterns

## Error Categories

The lint results show 122 problems across multiple categories:

- **TypeScript `any` types**: 30+ instances
- **React Hooks violations**: 50+ instances (refs in render, setState in effects, missing dependencies)
- **Unused variables/imports**: 15+ instances
- **Code style issues**: 10+ instances (prefer-const, no-case-declarations, etc.)
- **Impure functions**: 1 instance (Math.random in render)

## Strategic Approach

### Phase 1: Quick Wins (Completed)

1. **Auto-fix simple issues** (10 errors fixable with `--fix`)

- Run `npm run lint -- --fix` to fix prefer-const, simple formatting
- Files: `OptionPicker.tsx`, `legacyEncoding.ts`, `promptUtils.ts`

2. **Remove unused imports/variables**

- `App.tsx`: Remove `workspaces`, `workspaceImage`
- `InpaintParametersPanel.tsx`: Remove `useState`, `cn`
- `ZoomToolbar.tsx`: Remove `uiVisible`
- `useCanvasState.tsx`: Remove unused `_scale` parameter
- `PropertiesPanel.tsx`: Remove unused imports (`ChevronRight`, `Settings`, `ImageIcon`) and props
- `Sidebar.tsx`: Remove `Trash2`
- `Welcome.tsx`: Remove `features`

3. **Fix vite.config.js** *(Completed)*

- Added `process` to globals or switched to `import.meta.env` where appropriate

### Phase 2: TypeScript Type Safety (Completed)

4. **Replace `any` types in Api.ts** (13 instances) *(Completed)*

- Lines 45, 99, 105-106, 125, 134, 197-198, 212, 264-265, 369
- Create proper interfaces/types for API responses
- Use `unknown` with type guards where types are truly dynamic

5. **Fix `any` types in other files** *(Completed)*

- `NodeComponent.tsx` (line 16)
- `NodeField.tsx` (line 14)
- `legacyEncoding.ts` (multiple instances) - use proper types for encoding functions
- `useWebSocketProgress.ts` (line 13)
- `components.ts` (line 21)

### Phase 3: React Hooks Refactoring (Strategic Sub-phases)

With Phases 1 and 2 complete, focus now shifts entirely to the remaining hook-driven lint fixes. Phase 3 is broken down into 6 strategic sub-phases, ordered by risk level and dependencies:

#### Phase 3.1: Variable Declaration Order (Safest - No Dependencies)

**Goal**: Fix variable/function accessed before declaration (3 instances)

- `useDrawing.tsx`: Line 106 - Move `getMaskDataUrl` declaration before its usage in useEffect
- `TagComponent.tsx`: Line 26 - Move `adjustInputWidth` declaration before useEffect
- `WorkspaceBrowser.tsx`: Line 29 - Move `loadStructure` declaration before useEffect

**Risk**: Very low - just reordering code, no logic changes
**Dependencies**: None
**Testing**: Verify functions still work correctly after reordering

#### Phase 3.2: Simple setState in Effects - Derivable State (Low Risk - Independent)

**Goal**: Convert simple setState in effects to derived state or initialization (4 instances)

- `UpscaleDialog.tsx`: Lines 24, 32
- Line 24: `setCurrentUpscaler(selectedUpscaler)` - derive from prop directly or use `useMemo`
- Line 32: localStorage sync - move to initialization or use `useMemo` with localStorage read
- `useWorkspaceTabs.ts`: Line 36 - Move localStorage sync to initialization (read once on mount)
- `Sidebar.tsx`: Line 56 - Derive `canvasDimensions` from `currentImage` directly using `useMemo` instead of effect

**Risk**: Low - these are straightforward conversions to derived state
**Dependencies**: None
**Testing**: Verify localStorage persistence and derived values update correctly

#### Phase 3.3: Ref-to-State Conversions (Medium Risk - Foundational)

**Goal**: Convert refs accessed during render to state (7 instances)

- `CanvasArea.tsx`: Line 386 - `isMouseOverCanvas.current` accessed in render
- Convert `isMouseOverCanvas` ref to `useState<boolean>(false)`
- Update all assignments from `isMouseOverCanvas.current = ...` to `setIsMouseOverCanvas(...)`
- Update render access from `isMouseOverCanvas.current` to `isMouseOverCanvas`
- `TagsNodeContent.tsx`: Line 53-56 - `hasFocusedInitialTag.current` accessed in render
- Convert to `useState<boolean>(false)` or move focus logic to `useEffect` with proper dependencies
- `InpaintCanvas.tsx`: Lines 339, 378-381, 391, 429
- Line 339: `fileHandling.openFileDialog` - verify if this is already state-based (check `useFileHandling.tsx`)
- Lines 378-381: `fileHandling.isDragOver` - verify if already state (should be from `useFileHandling` hook)
- If these are refs, convert to state; if already state, ensure proper usage

**Risk**: Medium - requires careful state management to avoid unnecessary re-renders
**Dependencies**: None (foundational for Phase 3.5)
**Testing**: Verify drag/drop, mouse interactions, and focus behavior work correctly

#### Phase 3.4: Complex setState in Effects (Higher Risk - May Need Refactoring)

**Goal**: Refactor complex setState in effects to derived state or reducer pattern (4 instances)

- `useCanvasState.tsx`: Lines 177, 190
- Line 177: `setViewMode` in effect - refactor to derived state using `useMemo` based on `forceEditMode`, `livePreview`, `displayImage`, `inputImage`
- Line 190: `setShowMask` and mask visibility memory logic - consider `useReducer` or derived state with `useMemo`
- `OptionPicker.tsx`: Line 39 - `setPosition` in effect
- Use `useLayoutEffect` if DOM measurement is needed, or derive position from props/state
- `useWebSocketProgress.ts`: Line 198 - `setProgress(null)` and `setLivePreview(null)` in effect
- Use conditional rendering or derive state - consider if this can be handled in the subscription callback instead

**Risk**: Higher - may require architectural changes (reducers, derived state patterns)
**Dependencies**: None (but benefits from Phase 3.3 completion)
**Testing**: Thoroughly test view mode transitions, mask visibility, position calculations, and WebSocket progress handling

#### Phase 3.5: Dependency Array Fixes (Medium Risk - Depends on 3.3)

**Goal**: Fix missing dependencies in hooks (24 warnings)

- `App.tsx`: Add `initializeWorkspace`, `generateImage` to dependency arrays
- `CanvasArea.tsx`: Add `supportedBrushTools` to dependency array (line ~97)
- `useCanvasState.tsx`: Multiple `useCallback`/`useEffect` hooks need refs in dependencies
- After Phase 3.3, refs converted to state should be included in dependency arrays
- Functions like `calculateFitToScreenScale`, `calculateCenterOffset`, `getDisplayDimensions` may need refs/state added
- `useDrawing.tsx`: Add missing refs and functions to dependency arrays
- After Phase 3.1, `getMaskDataUrl` will be properly declared and can be added
- `PromptComposer.tsx`: Add `setNodes` to dependency arrays (lines with useCallback/useEffect)
- Use functional updates `setNodes(prev => ...)` where appropriate to avoid dependency

**Risk**: Medium - incorrect dependencies can cause bugs or infinite loops
**Dependencies**: Requires Phase 3.3 (refs converted to state) and Phase 3.1 (functions declared)
**Testing**: Verify no infinite loops, effects trigger correctly, callbacks update properly

#### Phase 3.6: Memoization Alignment (Low Risk - Depends on 3.5)

**Goal**: Fix preserve manual memoization issues (6 instances)

- `useCanvasState.tsx`: Lines 63, 87, 263, 273
- Align dependency arrays with actual dependencies (include refs/state from Phase 3.3 or remove memoization)
- Consider if memoization is needed for ref-based functions (may no longer be ref-based after 3.3)
- `PromptComposer.tsx`: Lines 339, 359, 390, 520
- Add `setNodes` to dependency arrays or use functional updates
- Ensure all dependencies from Phase 3.5 are included

**Risk**: Low - mainly ensuring consistency
**Dependencies**: Requires Phase 3.5 (correct dependency arrays)
**Testing**: Verify memoization works correctly, no unnecessary re-renders

### Phase 4: Code Quality

11. **Fix impure function in render**

- `OptionPicker.tsx`: Line 132 - Move `Math.random()` to `useMemo` or `useState` initialization

12. **Fix code style issues**

- `promptUtils.ts`: Add braces to case blocks (lines 13-15, 47-48, 66, 72)
- `legacyEncoding.ts`: Replace `hasOwnProperty` with `Object.prototype.hasOwnProperty.call()` (lines 14, 43)

## Implementation Order

1. **Phase 3.1** - Variable declaration order (safest hooks fix)
2. **Phase 3.2** - Simple setState conversions (low risk)
3. **Phase 3.3** - Ref-to-state conversions (foundational for dependencies)
4. **Phase 3.4** - Complex setState refactoring (higher risk, test thoroughly)
5. **Phase 3.5** - Dependency array fixes (depends on 3.3)
6. **Phase 3.6** - Memoization alignment (depends on 3.5)
7. **Phase 4** - Code quality fixes (Math.random, case braces, hasOwnProperty)

## Files to Modify

### Phase 1 & 4

- `client/src/App.tsx` - Unused vars
- `client/src/components/InpaintCanvas/components/InpaintParametersPanel.tsx` - Unused imports
- `client/src/components/InpaintCanvas/components/ZoomToolbar.tsx` - Unused var
- `client/src/components/PropertiesPanel.tsx` - Unused imports
- `client/src/components/Sidebar.tsx` - Unused import
- `client/src/components/Welcome.tsx` - Unused var
- `client/src/components/OptionPicker.tsx` - Math.random, prefer-const
- `client/src/components/PromptComposer/utils/promptUtils.ts` - Case declarations, prefer-const
- `client/src/components/PromptComposer/utils/legacyEncoding.ts` - hasOwnProperty, prefer-const
- `client/vite.config.js` - process undefined

### Phase 2

- `client/src/Api.ts` - Type definitions
- `client/src/components/PromptComposer/components/NodeComponent.tsx` - any type
- `client/src/components/PromptComposer/components/NodeField.tsx` - any type
- `client/src/components/PromptComposer/utils/legacyEncoding.ts` - any types
- `client/src/hooks/useWebSocketProgress.ts` - any type
- `client/src/types/components.ts` - any type

### Phase 3.1

- `client/src/components/InpaintCanvas/hooks/useDrawing.tsx` - Variable order
- `client/src/components/PromptComposer/components/TagComponent.tsx` - Variable order
- `client/src/components/WorkspaceBrowser.tsx` - Variable order

### Phase 3.2

- `client/src/components/UpscaleDialog.tsx` - setState in effects
- `client/src/hooks/useWorkspaceTabs.ts` - setState in effect
- `client/src/components/Sidebar.tsx` - setState in effect

### Phase 3.3

- `client/src/components/InpaintCanvas/components/CanvasArea.tsx` - Refs in render
- `client/src/components/InpaintCanvas/components/InpaintCanvas.tsx` - Refs in render
- `client/src/components/PromptComposer/node-contents/TagsNodeContent.tsx` - Refs in render

### Phase 3.4

- `client/src/components/InpaintCanvas/hooks/useCanvasState.tsx` - Complex setState in effects
- `client/src/components/OptionPicker.tsx` - setState in effect
- `client/src/hooks/useWebSocketProgress.ts` - setState in effect

### Phase 3.5

- `client/src/App.tsx` - Hook dependencies
- `client/src/components/InpaintCanvas/components/CanvasArea.tsx` - Hook dependencies
- `client/src/components/InpaintCanvas/hooks/useCanvasState.tsx` - Hook dependencies
- `client/src/components/InpaintCanvas/hooks/useDrawing.tsx` - Hook dependencies
- `client/src/components/PromptComposer/PromptComposer.tsx` - Hook dependencies

### Phase 3.6

- `client/src/components/InpaintCanvas/hooks/useCanvasState.tsx` - Memoization
- `client/src/components/PromptComposer/PromptComposer.tsx` - Memoization

## Testing Strategy

After each phase:

1. Run `npm run lint` to verify fixes
2. Run `npm run build` to ensure no TypeScript compilation errors
3. Test affected components manually to ensure functionality is preserved

### Phase-Specific Testing

- **Phase 3.1**: Verify functions still work after reordering
- **Phase 3.2**: Test localStorage persistence and derived values
- **Phase 3.3**: Test drag/drop, mouse interactions, focus behavior
- **Phase 3.4**: Test view mode transitions, mask visibility, position calculations, WebSocket progress
- **Phase 3.5**: Verify no infinite loops, effects trigger correctly
- **Phase 3.6**: Verify memoization works, no unnecessary re-renders