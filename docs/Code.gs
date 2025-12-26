// ============================================
// Smart Class Quiz - Google Apps Script API
// ============================================
// 이 코드를 Google Apps Script 편집기에 붙여넣으세요.
// 모든 요청을 GET으로 처리하여 CORS 문제를 해결합니다.
// ============================================

// 시트 이름
const SHEETS = {
  PARTICIPANTS: '참가자',
  QUESTIONS: '문제',
  ANSWERS: '문제선택',
  GAME_STATE: '게임상태'
};

// JSON 응답 생성
function createJsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET 요청 핸들러 (모든 요청을 GET으로 처리)
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch(action) {
      case 'getParticipants':
        result = getParticipants(e.parameter.sessionId);
        break;
      case 'addParticipant':
        result = addParticipant(e.parameter.name, e.parameter.sessionId);
        break;
      case 'getQuestions':
        result = getQuestions();
        break;
      case 'addQuestion':
        result = addQuestion({
          text: e.parameter.text,
          option1: e.parameter.option1,
          option2: e.parameter.option2,
          option3: e.parameter.option3,
          option4: e.parameter.option4,
          correctAnswer: parseInt(e.parameter.correctAnswer),
          timeLimit: parseInt(e.parameter.timeLimit)
        });
        break;
      case 'updateQuestion':
        result = updateQuestion({
          id: parseInt(e.parameter.id),
          text: e.parameter.text,
          option1: e.parameter.option1,
          option2: e.parameter.option2,
          option3: e.parameter.option3,
          option4: e.parameter.option4,
          correctAnswer: parseInt(e.parameter.correctAnswer),
          timeLimit: parseInt(e.parameter.timeLimit)
        });
        break;
      case 'submitAnswer':
        result = submitAnswer({
          participantId: e.parameter.participantId,
          questionId: parseInt(e.parameter.questionId),
          selectedAnswer: parseInt(e.parameter.selectedAnswer),
          responseTime: parseFloat(e.parameter.responseTime),
          sessionId: e.parameter.sessionId
        });
        break;
      case 'getAnswers':
        result = getAnswers(parseInt(e.parameter.questionId), e.parameter.sessionId);
        break;
      case 'getGameState':
        result = getGameState();
        break;
      case 'updateGameState':
        result = updateGameState(
          e.parameter.state,
          parseInt(e.parameter.currentQuestionIndex),
          parseInt(e.parameter.maxTimer),
          e.parameter.sessionId
        );
        break;
      case 'resetGame':
        result = resetGame();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  return createJsonOutput(result);
}

// POST 요청도 GET과 동일하게 처리 (호환성)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    e.parameter = data;
    e.parameter.action = data.action;
    return doGet(e);
  } catch (error) {
    return createJsonOutput({ success: false, error: error.toString() });
  }
}

// ============================================
// 참가자 관련 함수
// ============================================

// 참가자 목록 조회
function getParticipants(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PARTICIPANTS);

  if (!sheet) {
    return { success: false, error: '참가자 시트를 찾을 수 없습니다.' };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [] };
  }

  const participants = data.slice(1)
    .filter(row => row[0])
    .filter(row => !sessionId || row[4] === sessionId)
    .map(row => ({
      id: row[0],
      name: row[1],
      joinedAt: row[2],
      score: row[3] || 0,
      sessionId: row[4]
    }));

  return { success: true, data: participants };
}

// 참가자 추가
function addParticipant(name, sessionId) {
  if (!name) {
    return { success: false, error: '이름이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PARTICIPANTS);

  if (!sheet) {
    return { success: false, error: '참가자 시트를 찾을 수 없습니다.' };
  }

  const id = Utilities.getUuid();
  const joinedAt = new Date().toISOString();

  sheet.appendRow([id, name, joinedAt, 0, sessionId || '']);

  return {
    success: true,
    data: { id, name, joinedAt, score: 0, sessionId: sessionId || '' }
  };
}

// ============================================
// 문제 관련 함수
// ============================================

// 문제 목록 조회
function getQuestions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.QUESTIONS);

  if (!sheet) {
    return { success: false, error: '문제 시트를 찾을 수 없습니다.' };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [] };
  }

  const questions = data.slice(1)
    .filter(row => row[1])
    .map((row, index) => ({
      id: row[0] || (index + 1),
      text: row[1],
      options: [row[2], row[3], row[4], row[5]],
      correctAnswer: row[6] - 1,  // 1-based to 0-based
      timeLimit: row[7] || 20
    }));

  return { success: true, data: questions };
}

// 문제 추가
function addQuestion(data) {
  if (!data || !data.text) {
    return { success: false, error: '문제 내용이 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.QUESTIONS);

  if (!sheet) {
    return { success: false, error: '문제 시트를 찾을 수 없습니다.' };
  }

  const dataRange = sheet.getDataRange().getValues();
  const existingIds = dataRange
    .slice(1)
    .map(row => parseInt(row[0], 10))
    .filter(id => !isNaN(id));
  const nextId = existingIds.length > 0 ? Math.max.apply(null, existingIds) + 1 : 1;

  const correctAnswer = parseInt(data.correctAnswer, 10);
  if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
    return { success: false, error: '정답 번호는 1~4 사이여야 합니다.' };
  }

  const timeLimit = parseInt(data.timeLimit, 10) || 20;

  sheet.appendRow([
    nextId,
    data.text,
    data.option1 || '',
    data.option2 || '',
    data.option3 || '',
    data.option4 || '',
    correctAnswer,
    timeLimit
  ]);

  return {
    success: true,
    data: {
      id: nextId,
      text: data.text,
      options: [data.option1, data.option2, data.option3, data.option4],
      correctAnswer: correctAnswer - 1,
      timeLimit: timeLimit
    }
  };
}

// 문제 수정
function updateQuestion(data) {
  if (!data || !data.id) {
    return { success: false, error: '문제 ID가 필요합니다.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.QUESTIONS);

  if (!sheet) {
    return { success: false, error: '문제 시트를 찾을 수 없습니다.' };
  }

  const dataRange = sheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < dataRange.length; i++) {
    if (parseInt(dataRange[i][0], 10) === data.id) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, error: '수정할 문제를 찾을 수 없습니다.' };
  }

  const correctAnswer = parseInt(data.correctAnswer, 10);
  if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
    return { success: false, error: '정답 번호는 1~4 사이여야 합니다.' };
  }

  const timeLimit = parseInt(data.timeLimit, 10) || 20;

  sheet.getRange(targetRow, 1, 1, 8).setValues([[
    data.id,
    data.text || '',
    data.option1 || '',
    data.option2 || '',
    data.option3 || '',
    data.option4 || '',
    correctAnswer,
    timeLimit
  ]]);

  return {
    success: true,
    data: {
      id: data.id,
      text: data.text,
      options: [data.option1, data.option2, data.option3, data.option4],
      correctAnswer: correctAnswer - 1,
      timeLimit: timeLimit
    }
  };
}

// ============================================
// 답변 관련 함수
// ============================================

// 답변 제출
function submitAnswer(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const answerSheet = ss.getSheetByName(SHEETS.ANSWERS);
  const participantSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);

  if (!answerSheet || !participantSheet) {
    return { success: false, error: '시트를 찾을 수 없습니다.' };
  }

  // 문제 정보 가져오기
  const questionsResult = getQuestions();
  if (!questionsResult.success) {
    return questionsResult;
  }

  const question = questionsResult.data.find(q => q.id === data.questionId);
  if (!question) {
    return { success: false, error: '문제를 찾을 수 없습니다: ' + data.questionId };
  }

  const isCorrect = data.selectedAnswer === question.correctAnswer;

  // 점수 계산
  const BASE_SCORE = 500;
  const MAX_BONUS = 500;
  const timeLimit = question.timeLimit || 20;
  const score = isCorrect
    ? BASE_SCORE + Math.floor((1 - data.responseTime / timeLimit) * MAX_BONUS)
    : 0;

  // 답변 저장
  const answeredAt = new Date().toISOString();
  answerSheet.appendRow([
    data.participantId,
    data.questionId,
    data.selectedAnswer + 1,  // 0-based to 1-based
    isCorrect ? 'TRUE' : 'FALSE',
    score,
    data.responseTime,
    data.sessionId || '',
    answeredAt
  ]);

  // 참가자 점수 업데이트
  const participantData = participantSheet.getDataRange().getValues();
  for (let i = 1; i < participantData.length; i++) {
    if (participantData[i][0] === data.participantId) {
      const currentScore = participantData[i][3] || 0;
      participantSheet.getRange(i + 1, 4).setValue(currentScore + score);
      break;
    }
  }

  return {
    success: true,
    data: {
      isCorrect,
      score,
      correctAnswer: question.correctAnswer
    }
  };
}

// 특정 문제의 답변 통계 조회
function getAnswers(questionId, sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.ANSWERS);

  if (!sheet) {
    return { success: true, data: [] };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [] };
  }

  const answers = data.slice(1)
    .filter(row => row[1] == questionId)
    .filter(row => !sessionId || row[6] === sessionId)
    .map(row => ({
      participantId: row[0],
      questionId: row[1],
      selectedOption: row[2] - 1,  // 1-based to 0-based
      isCorrect: row[3] === true || row[3] === 'TRUE',
      score: row[4],
      responseTime: row[5],
      sessionId: row[6],
      answeredAt: row[7]
    }));

  const latestByParticipant = {};
  answers.forEach(answer => {
    latestByParticipant[answer.participantId] = answer;
  });

  return { success: true, data: Object.values(latestByParticipant) };
}

// ============================================
// 게임 상태 관련 함수
// ============================================

// 게임 상태 조회
function getGameState() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GAME_STATE);

  if (!sheet) {
    const sessionId = Utilities.getUuid();
    return {
      success: true,
      data: {
        state: 'LOBBY',
        currentQuestionIndex: 0,
        maxTimer: 20,
        sessionId: sessionId
      }
    };
  }

  const data = sheet.getDataRange().getValues();
  const stateMap = {};
  let sessionRowIndex = -1;

  data.slice(1).forEach((row, index) => {
    if (row[0]) {
      stateMap[row[0]] = row[1];
      if (row[0] === 'sessionId') {
        sessionRowIndex = index + 2; // header row offset
      }
    }
  });

  if (!stateMap.sessionId) {
    const newSessionId = Utilities.getUuid();
    stateMap.sessionId = newSessionId;
    if (sessionRowIndex > 0) {
      sheet.getRange(sessionRowIndex, 2).setValue(newSessionId);
    } else {
      sheet.appendRow(['sessionId', newSessionId]);
    }
  }

  return {
    success: true,
    data: {
      state: stateMap.state || 'LOBBY',
      currentQuestionIndex: parseInt(stateMap.currentQuestionIndex) || 0,
      maxTimer: parseInt(stateMap.maxTimer) || 20,
      sessionId: stateMap.sessionId,
      updatedAt: stateMap.updatedAt
    }
  };
}

// 게임 상태 업데이트
function updateGameState(state, currentQuestionIndex, maxTimer, sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.GAME_STATE);

  // 시트가 없으면 생성
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.GAME_STATE);
    sheet.appendRow(['key', 'value']);
    sheet.appendRow(['state', 'LOBBY']);
    sheet.appendRow(['currentQuestionIndex', 0]);
    sheet.appendRow(['maxTimer', 20]);
    sheet.appendRow(['sessionId', sessionId || Utilities.getUuid()]);
    sheet.appendRow(['updatedAt', new Date().toISOString()]);
  }

  const data = sheet.getDataRange().getValues();
  const existingKeys = {};
  let existingSessionId = '';

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    if (key) {
      existingKeys[key] = true;
    }
    if (key === 'sessionId') {
      existingSessionId = data[i][1];
    }
  }

  const effectiveSessionId = sessionId || existingSessionId || Utilities.getUuid();
  const updates = {
    state: state,
    currentQuestionIndex: currentQuestionIndex,
    maxTimer: maxTimer,
    sessionId: effectiveSessionId,
    updatedAt: new Date().toISOString()
  };

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    if (updates[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(updates[key]);
    }
  }

  // 누락된 키는 새로 추가 (시트가 이미 있었지만 행이 비어있는 경우 대비)
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined && !existingKeys[key]) {
      sheet.appendRow([key, updates[key]]);
    }
  });

  return { success: true };
}

// 게임 리셋
function resetGame() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 참가자 시트 초기화 (헤더 유지)
  const participantSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
  if (participantSheet && participantSheet.getLastRow() > 1) {
    participantSheet.deleteRows(2, participantSheet.getLastRow() - 1);
  }

  // 답변 시트 초기화 (헤더 유지)
  const answerSheet = ss.getSheetByName(SHEETS.ANSWERS);
  if (answerSheet && answerSheet.getLastRow() > 1) {
    answerSheet.deleteRows(2, answerSheet.getLastRow() - 1);
  }

  // 게임 상태 초기화
  updateGameState('LOBBY', 0, 20, Utilities.getUuid());

  return { success: true };
}

// ============================================
// 테스트 함수 (Apps Script 에디터에서 실행)
// ============================================
function testGetQuestions() {
  const result = getQuestions();
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetParticipants() {
  const result = getParticipants();
  Logger.log(JSON.stringify(result, null, 2));
}

function testAddParticipant() {
  const result = addParticipant('테스트학생');
  Logger.log(JSON.stringify(result, null, 2));
}
