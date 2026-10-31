import type { QuestionnairesRepository, QuestionnaireRecord } from './ports'

export interface UpdateQuestionnaireDeps {
	questionnaires: QuestionnairesRepository
}

export interface UpdateQuestionnaireInput {
	title?: string
	data?: Record<string, unknown>
}

export async function updateQuestionnaire(
	deps: UpdateQuestionnaireDeps,
	{ id, data }: { id: string; data: UpdateQuestionnaireInput },
): Promise<QuestionnaireRecord> {
	return await deps.questionnaires.update(id, {
		title: data.title,
		data: data.data ? JSON.stringify(data.data) : undefined,
	})
}

