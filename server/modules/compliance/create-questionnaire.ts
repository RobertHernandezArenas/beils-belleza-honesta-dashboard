import type { QuestionnairesRepository, QuestionnaireRecord } from './ports'

export interface CreateQuestionnaireDeps {
	questionnaires: QuestionnairesRepository
}

export interface CreateQuestionnaireInput {
	user_id: string
	title: string
	data: Record<string, unknown>
}

export async function createQuestionnaire(
	deps: CreateQuestionnaireDeps,
	input: CreateQuestionnaireInput,
): Promise<QuestionnaireRecord> {
	return await deps.questionnaires.create({
		user_id: input.user_id,
		title: input.title,
		data: JSON.stringify(input.data),
	})
}

