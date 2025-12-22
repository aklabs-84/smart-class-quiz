# Google Sheets 설정 가이드

## 1. Google Sheets 생성

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 스프레드시트 이름: `Smart Class Quiz Database`

---

## 2. 시트 구조

### 2.1 '참가자' 시트

첫 번째 시트 이름을 `참가자`로 변경하고 아래 헤더를 A1부터 입력:

| A | B | C | D |
|---|---|---|---|
| id | name | joinedAt | score |

**컬럼 설명:**
- `id`: 고유 식별자 (UUID)
- `name`: 참가자 이름
- `joinedAt`: 참여 시간 (ISO 문자열)
- `score`: 총 점수

---

### 2.2 '문제' 시트

새 시트를 추가하고 이름을 `문제`로 설정, 아래 헤더 입력:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| id | text | option1 | option2 | option3 | option4 | correctAnswer | timeLimit |

**컬럼 설명:**
- `id`: 문제 번호 (1, 2, 3...)
- `text`: 문제 내용
- `option1~4`: 4개의 선택지
- `correctAnswer`: 정답 번호 (1, 2, 3, 4)
- `timeLimit`: 제한 시간 (초)

**샘플 데이터:**

| id | text | option1 | option2 | option3 | option4 | correctAnswer | timeLimit |
|----|------|---------|---------|---------|---------|---------------|-----------|
| 1 | 대한민국의 수도는 어디인가요? | 부산 | 대구 | 서울 | 광주 | 3 | 20 |
| 2 | React의 창시자는? | Google | Meta (Facebook) | Microsoft | Apple | 2 | 20 |
| 3 | 다음 중 프로그래밍 언어가 아닌 것은? | Python | Java | HTML | C++ | 3 | 15 |
| 4 | 세계에서 가장 높은 산은? | 백두산 | 에베레스트 | 후지산 | K2 | 2 | 15 |
| 5 | 1 + 1 = ? | 1 | 2 | 3 | 11 | 2 | 10 |

---

### 2.3 '문제선택' 시트

새 시트를 추가하고 이름을 `문제선택`으로 설정, 아래 헤더 입력:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| participantId | questionId | selectedAnswer | isCorrect | score | responseTime |

**컬럼 설명:**
- `participantId`: 참가자 ID
- `questionId`: 문제 번호
- `selectedAnswer`: 선택한 답 (1, 2, 3, 4)
- `isCorrect`: 정답 여부 (TRUE/FALSE)
- `score`: 획득 점수
- `responseTime`: 응답 시간 (초)

---

### 2.4 '게임상태' 시트

새 시트를 추가하고 이름을 `게임상태`로 설정, 아래 내용 입력:

| A | B |
|---|---|
| key | value |
| state | LOBBY |
| currentQuestionIndex | 0 |
| maxTimer | 20 |
| updatedAt | (자동 업데이트) |

---

## 3. Google Apps Script 설정

### 3.1 Apps Script 열기

1. 스프레드시트에서 `확장 프로그램` > `Apps Script` 클릭
2. 프로젝트 이름: `SmartQuizAPI`

### 3.2 코드 붙여넣기

`Code.gs` 파일에 아래 코드를 붙여넣기합니다:

```javascript
// 스프레드시트 ID (URL에서 /d/ 뒤의 값)
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// 시트 이름
const SHEETS = {
  PARTICIPANTS: '참가자',
  QUESTIONS: '문제',
  ANSWERS: '문제선택',
  GAME_STATE: '게임상태'
};

// CORS 헤더 설정
function createCorsOutput(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// GET 요청 핸들러
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch(action) {
      case 'getParticipants':
        result = getParticipants();
        break;
      case 'getQuestions':
        result = getQuestions();
        break;
      case 'getGameState':
        result = getGameState();
        break;
      case 'getAnswers':
        result = getAnswers(e.parameter.questionId);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  return createCorsOutput(result);
}

// POST 요청 핸들러
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  try {
    switch(action) {
      case 'addParticipant':
        result = addParticipant(data.name);
        break;
      case 'submitAnswer':
        result = submitAnswer(data);
        break;
      case 'updateGameState':
        result = updateGameState(data.state, data.currentQuestionIndex, data.maxTimer);
        break;
      case 'resetGame':
        result = resetGame();
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  return createCorsOutput(result);
}

// 참가자 목록 조회
function getParticipants() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.PARTICIPANTS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return { success: true, data: [] };

  const participants = data.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    joinedAt: row[2],
    score: row[3] || 0
  }));

  return { success: true, data: participants };
}

// 참가자 추가
function addParticipant(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.PARTICIPANTS);
  const id = Utilities.getUuid();
  const joinedAt = new Date().toISOString();

  sheet.appendRow([id, name, joinedAt, 0]);

  return {
    success: true,
    data: { id, name, joinedAt, score: 0 }
  };
}

// 문제 목록 조회
function getQuestions() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.QUESTIONS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return { success: true, data: [] };

  const questions = data.slice(1).map(row => ({
    id: row[0],
    text: row[1],
    options: [row[2], row[3], row[4], row[5]],
    correctAnswer: row[6] - 1,  // 1-based to 0-based
    timeLimit: row[7] || 20
  }));

  return { success: true, data: questions };
}

// 답변 제출
function submitAnswer(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.ANSWERS);
  const participantSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.PARTICIPANTS);

  // 문제 정보 가져오기
  const questions = getQuestions().data;
  const question = questions.find(q => q.id === data.questionId);

  if (!question) {
    return { success: false, error: 'Question not found' };
  }

  const isCorrect = data.selectedAnswer === question.correctAnswer;

  // 점수 계산
  const BASE_SCORE = 500;
  const MAX_BONUS = 500;
  const score = isCorrect
    ? BASE_SCORE + Math.floor((1 - data.responseTime / question.timeLimit) * MAX_BONUS)
    : 0;

  // 답변 저장
  sheet.appendRow([
    data.participantId,
    data.questionId,
    data.selectedAnswer + 1,  // 0-based to 1-based
    isCorrect,
    score,
    data.responseTime
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
function getAnswers(questionId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.ANSWERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return { success: true, data: [] };

  const answers = data.slice(1)
    .filter(row => row[1] == questionId)
    .map(row => ({
      participantId: row[0],
      questionId: row[1],
      selectedAnswer: row[2] - 1,  // 1-based to 0-based
      isCorrect: row[3],
      score: row[4],
      responseTime: row[5]
    }));

  return { success: true, data: answers };
}

// 게임 상태 조회
function getGameState() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.GAME_STATE);
  const data = sheet.getDataRange().getValues();

  const stateMap = {};
  data.slice(1).forEach(row => {
    stateMap[row[0]] = row[1];
  });

  return {
    success: true,
    data: {
      state: stateMap.state || 'LOBBY',
      currentQuestionIndex: parseInt(stateMap.currentQuestionIndex) || 0,
      maxTimer: parseInt(stateMap.maxTimer) || 20,
      updatedAt: stateMap.updatedAt
    }
  };
}

// 게임 상태 업데이트
function updateGameState(state, currentQuestionIndex, maxTimer) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.GAME_STATE);
  const data = sheet.getDataRange().getValues();

  const updates = {
    state: state,
    currentQuestionIndex: currentQuestionIndex,
    maxTimer: maxTimer,
    updatedAt: new Date().toISOString()
  };

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    if (updates[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(updates[key]);
    }
  }

  return { success: true };
}

// 게임 리셋
function resetGame() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 참가자 시트 초기화 (헤더 유지)
  const participantSheet = ss.getSheetByName(SHEETS.PARTICIPANTS);
  if (participantSheet.getLastRow() > 1) {
    participantSheet.deleteRows(2, participantSheet.getLastRow() - 1);
  }

  // 답변 시트 초기화 (헤더 유지)
  const answerSheet = ss.getSheetByName(SHEETS.ANSWERS);
  if (answerSheet.getLastRow() > 1) {
    answerSheet.deleteRows(2, answerSheet.getLastRow() - 1);
  }

  // 게임 상태 초기화
  updateGameState('LOBBY', 0, 20);

  return { success: true };
}
```

### 3.3 배포하기

1. `배포` > `새 배포` 클릭
2. 유형: `웹 앱` 선택
3. 설명: `Smart Quiz API v1`
4. 실행 계정: `나`
5. 액세스 권한: `모든 사용자`
6. `배포` 클릭
7. 권한 승인 (Google 계정)
8. **배포 URL 복사** (이 URL을 `.env.local`에 설정)

---

## 4. 프론트엔드 연동

`.env.local` 파일에 배포 URL 설정:

```
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

---

## 5. 테스트

브라우저에서 아래 URL로 테스트:

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getQuestions
```

JSON 응답이 오면 성공!
