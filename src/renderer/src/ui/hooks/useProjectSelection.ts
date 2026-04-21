import { useEffect } from 'react'
import { useCoreStore } from '../../infra/store/coreStore'
import { useProjectStore } from '../../infra/store/projectStore'

export function useProjectSelection() {
  const projectId = useCoreStore((s) => s.projectId)
  const currentProject = useCoreStore((s) => s.projectPath)
  const openProjectStarted = useCoreStore((s) => s.openProjectStarted)
  const projectOpened = useCoreStore((s) => s.projectOpened)
  const sessionFailed = useCoreStore((s) => s.sessionFailed)

  const recentProjects = useProjectStore((s) => s.recentProjects)
  const gamePath = useProjectStore((s) => s.gamePath)
  const gameVerification = useProjectStore((s) => s.gameVerification)
  const pendingProject = useProjectStore((s) => s.pendingProject)
  const setResolvedPaths = useProjectStore((s) => s.setResolvedPaths)
  const setRecentProjects = useProjectStore((s) => s.setRecentProjects)
  const setGamePath = useProjectStore((s) => s.setGamePath)
  const setGameVerification = useProjectStore((s) => s.setGameVerification)
  const setPendingProject = useProjectStore((s) => s.setPendingProject)

  useEffect(() => {
    window.api.projects.getRecent().then(setRecentProjects)
    window.api.game.getPath().then(async (path) => {
      if (!path) return
      const verification = await window.api.game.verifyPath(path)
      setGamePath(path)
      setGameVerification(verification)
    })
  }, [])

  async function browseForGamePath() {
    const path = await window.api.dialogs.openFolder()
    if (!path) return
    const verification = await window.api.game.verifyPath(path)
    setGamePath(path)
    setGameVerification(verification)
    if (verification.valid) await window.api.game.setPath(path)
  }

  async function selectProject(path: string) {
    const modVerification = await window.api.projects.verifyModPath(path)
    if (!modVerification.hasAny) {
      setPendingProject({ path, verification: modVerification })
      return
    }
    await loadProject(path)
  }

  async function confirmPendingProject() {
    if (!pendingProject) return
    await loadProject(pendingProject.path)
    setPendingProject(null)
  }

  function cancelPendingProject() {
    setPendingProject(null)
  }

  async function loadProject(path: string) {
    openProjectStarted(path)
    try {
      const opened = await window.api.projects.open({ gamePath: gamePath!, modPath: path })
      setResolvedPaths(opened.resolvedPaths)
      projectOpened(opened.projectId, path)
      await window.api.projects.addRecent(path)
      setRecentProjects(await window.api.projects.getRecent())
      await window.api.window.enterEditor()
    } catch (error) {
      sessionFailed(error instanceof Error ? error.message : 'Failed to open project')
      throw error
    }
  }

  async function browseForProject() {
    const path = await window.api.dialogs.openFolder()
    if (path) await selectProject(path)
  }

  async function removeProject(path: string) {
    await window.api.projects.removeRecent(path)
    setRecentProjects(await window.api.projects.getRecent())
  }

  const gamePathValid = gameVerification?.valid ?? null

  return {
    currentProjectId: projectId,
    currentProject,
    recentProjects,
    gamePath,
    gamePathValid,
    gameVerification,
    pendingProject,
    selectProject,
    browseForProject,
    browseForGamePath,
    confirmPendingProject,
    cancelPendingProject,
    removeProject
  }
}
