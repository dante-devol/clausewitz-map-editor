import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useResolvedPathsStore } from '../store/resolvedPathsStore'

export function useProjectSelection() {
  const currentProject = useProjectStore((s) => s.currentProject)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const gamePath = useProjectStore((s) => s.gamePath)
  const gameVerification = useProjectStore((s) => s.gameVerification)
  const pendingProject = useProjectStore((s) => s.pendingProject)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const setRecentProjects = useProjectStore((s) => s.setRecentProjects)
  const setGamePath = useProjectStore((s) => s.setGamePath)
  const setGameVerification = useProjectStore((s) => s.setGameVerification)
  const setPendingProject = useProjectStore((s) => s.setPendingProject)
  const setPaths = useResolvedPathsStore((s) => s.setPaths)

  useEffect(() => {
    window.api.getRecentProjects().then(setRecentProjects)
    window.api.getGamePath().then(async (path) => {
      if (!path) return
      const verification = await window.api.verifyGamePaths(path)
      setGamePath(path)
      setGameVerification(verification)
    })
  }, [])

  async function browseForGamePath() {
    const path = await window.api.openFolderDialog()
    if (!path) return
    const verification = await window.api.verifyGamePaths(path)
    setGamePath(path)
    setGameVerification(verification)
    if (verification.valid) await window.api.setGamePath(path)
  }

  async function selectProject(path: string) {
    const modVerification = await window.api.verifyModPaths(path)
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
    const resolved = await window.api.resolvePaths(gamePath!, path)
    setPaths(resolved)
    await window.api.addRecentProject(path)
    setRecentProjects(await window.api.getRecentProjects())
    await window.api.enterEditor()
    setCurrentProject(path)
  }

  async function browseForProject() {
    const path = await window.api.openFolderDialog()
    if (path) await selectProject(path)
  }

  async function removeProject(path: string) {
    await window.api.removeRecentProject(path)
    setRecentProjects(await window.api.getRecentProjects())
  }

  const gamePathValid = gameVerification?.valid ?? null

  return {
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
