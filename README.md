# UI/UX New Project

Builder.io dev-tools를 사용하는 프로젝트입니다.

## 설치

```bash
npm install
```

## Builder.io 코드 생성

다음 명령어로 Builder.io에서 코드를 생성할 수 있습니다:

```bash
npm run builder:code -- --url vcp://quickcopy/vcp-02ecfd10f87447cc856b2277c8051821
```

또는 직접 실행:

```bash
npx "@builder.io/dev-tools@latest" code --url vcp://quickcopy/vcp-02ecfd10f87447cc856b2277c8051821
```

## 명령어 실행 후 단계

명령어를 실행한 후에는 다음 단계를 따르세요:

1. **생성된 파일 확인**: `components/` 디렉토리에서 생성된 컴포넌트 파일들을 확인하세요.

2. **의존성 설치**: 필요한 경우 추가 패키지를 설치합니다.
   ```bash
   npm install
   ```

3. **컴포넌트 사용**: 생성된 컴포넌트를 `app/page.tsx` 또는 다른 페이지에서 import하여 사용합니다.

4. **개발 서버 실행**: 
   ```bash
   npm run dev
   ```

5. **브라우저에서 확인**: `http://localhost:3000`에서 결과를 확인합니다.

자세한 내용은 [BUILDER_GUIDE.md](./BUILDER_GUIDE.md)를 참고하세요.

## 개발 서버 실행

```bash
npm run dev
```

