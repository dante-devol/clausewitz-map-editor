import type { CoreState } from '../contracts/CoreState'

export const selectSessionStatus = (state: CoreState) => state.session.status
export const selectCurrentProjectId = (state: CoreState) => state.session.projectId
export const selectCurrentProjectPath = (state: CoreState) => state.session.projectPath
export const selectSessionErrorMessage = (state: CoreState) => state.session.errorMessage
export const selectHasOpenProject = (state: CoreState) => state.session.projectPath !== null
