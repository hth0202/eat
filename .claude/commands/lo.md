로컬 개발 서버를 시작합니다.

포트 인자: $ARGUMENTS
- 비어있으면 기본값 3000 사용
- 숫자가 주어지면 그 포트 사용 (예: `/lo 8080`)

아래 순서대로 Bash 툴로 실행하세요:

**1. 포트 결정**
```
PORT=$ARGUMENTS
PORT=${PORT:-3000}
```

**2. 해당 포트의 기존 프로세스 전부 종료**
```bash
lsof -ti:$PORT | xargs kill -9 2>/dev/null; true
```
종료된 PID가 있으면 사용자에게 알려주세요.

**3. 개발 서버 시작 (백그라운드)**
```bash
cd /Users/taffy/Documents/dev/eat && python3 -m http.server $PORT
```
`run_in_background: true` 로 실행하세요.

**4. 브라우저 열기**
```bash
open http://localhost:$PORT
```

**5. 결과 출력**
서버가 시작되면 다음 형식으로 알려주세요:
- URL: http://localhost:$PORT
- 종료 방법: `kill $(lsof -ti:$PORT)`
