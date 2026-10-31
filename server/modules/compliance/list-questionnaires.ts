import type { QuestionnairesRepository, QuestionnaireRecord } from './ports'

export interface ListQuestionnairesDeps {
	questionnaires: QuestionnairesRepository
}

export async function listQuestionnaires(
	deps: ListQuestionnairesDeps,
	{ userId }: { userId?: string } = {},
): Promise<QuestionnaireRecord[]> {
	return await deps.questionnaires.findMany(userId)
}

