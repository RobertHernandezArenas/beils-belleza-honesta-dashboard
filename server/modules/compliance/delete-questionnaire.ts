import type { QuestionnairesRepository } from './ports'

export interface DeleteQuestionnaireDeps {
	questionnaires: QuestionnairesRepository
}

export async function deleteQuestionnaire(
	deps: DeleteQuestionnaireDeps,
	{ id }: { id: string },
): Promise<{ success: true }> {
	await deps.questionnaires.delete(id)
	return { success: true }
}

