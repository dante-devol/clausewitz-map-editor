import { useEffect } from 'react'
import { useProjectStore } from '../store/projectStore'

export function useProjectSelection() {
  const currentProject = useProjectStore((s) => s.currentProject)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const setRecentProjects = useProjectStore((s) => s.setRecentProjects)

  useEffect(() => {
    window.api.getRecentProjects().then(setRecentProjects)
  }, [])

  async function openProject(path: string) {
    await window.api.addRecentProject(path)
    setRecentProjects(await window.api.getRecentProjects())
    await window.api.enterEditor()
    setCurrentProject(path)
  }

  async function browseForProject() {
    const path = await window.api.openFolderDialog()
    if (path) await openProject(path)
  }

  async function removeProject(path: string) {
    await window.api.removeRecentProject(path)
    setRecentProjects(await window.api.getRecentProjects())
  }

  return { currentProject, recentProjects, openProject, browseForProject, removeProject }
}
