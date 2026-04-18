import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'

export function useProjectSelection() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const currentProject = useProjectStore((s) => s.currentProject)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const gamePath = useProjectStore((s) => s.gamePath)
  const gameVerification = useProjectStore((s) => s.gameVerification)
  const pendingProject = useProjectStore((s) => s.pendingProject)
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
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
      // No recognized paths — hold as pending and let the UI prompt the user.
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
    const opened = await window.api.projects.open({ gamePath: gamePath!, modPath: path })
    setCurrentProjectId(opened.projectId)
    await window.api.projects.addRecent(path)
    setRecentProjects(await window.api.projects.getRecent())
    await window.api.window.enterEditor()
    setCurrentProject(path)
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
    currentProjectId,
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
