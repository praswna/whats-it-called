import type { Lib } from "./types";

// 용어 id → 그 기능을 만들 때 많이 쓰는 라이브러리. 상세 화면 "주요 라이브러리" 와 검색에 쓰인다.
const L = (name: string, tag: string, note: string, url?: string): Lib => ({ name, tag, note, url });
const gh = (repo: string) => `https://github.com/${repo}`;

// 여러 용어가 함께 쓰는 것
const radix = (part: string) => L(`Radix UI ${part}`, "React", "스타일 없는 접근성 갖춘 부품. shadcn/ui 의 바탕", "https://www.radix-ui.com/primitives");
const floatingUi = L("Floating UI", "JS·React", "떠 있는 요소를 화면 밖으로 안 나가게 자리 잡아 줌 (Popper 후속)", "https://floating-ui.com");
const headless = L("Headless UI", "React·Vue", "Tailwind 팀이 만든 스타일 없는 부품", "https://headlessui.com");
const tanQuery = L("TanStack Query", "JS·React", "서버 데이터 캐시·재요청·재시도를 알아서 (구 React Query)", "https://tanstack.com/query");
const swr = L("SWR", "React", "Vercel 의 가벼운 데이터 요청·캐시 훅", "https://swr.vercel.app");
const motion = L("Motion", "React·JS", "가장 많이 쓰는 React 애니메이션 (구 Framer Motion)", "https://motion.dev");
const gsap = L("GSAP", "JS", "타임라인·스크롤·SVG 까지 다 되는 애니메이션 엔진", "https://gsap.com");
const reactSpring = L("React Spring", "React", "스프링 물리로 움직이는 애니메이션", "https://react-spring.dev");
const electron = L("Electron", "JS", "웹 기술로 데스크톱 앱 (VS Code, Slack, Discord)", "https://www.electronjs.org");
const tauri = L("Tauri", "Rust·JS", "운영체제 웹뷰를 써서 훨씬 가벼운 데스크톱·모바일 앱", "https://tauri.app");
const vite = L("Vite", "JS", "빠른 개발 서버 + Rollup 기반 빌드", "https://vite.dev");
const embla = L("Embla Carousel", "JS·React", "가볍고 부드러운 캐러셀 엔진", "https://www.embla-carousel.com");
const swiper = L("Swiper", "JS", "모바일 터치 슬라이더의 사실상 표준", "https://swiperjs.com");
const vtk = L("VTK", "C++·Python", "과학 시각화의 원조", "https://vtk.org");
const vtkjs = L("vtk.js", "JS", "VTK 의 브라우저판", "https://kitware.github.io/vtk-js/");
const itk = L("ITK", "C++·Python", "의료 영상 분석", "https://itk.org");
const sitk = L("SimpleITK", "Python 등", "ITK 를 쉽게", "https://simpleitk.org");
const slicer = L("3D Slicer", "앱·Python", "무료 의료 영상 분석 프로그램", "https://www.slicer.org");
const three = L("Three.js", "JS", "웹 3D 의 대표", "https://threejs.org");
const opencv = L("OpenCV", "C++·Python", "컴퓨터 비전 종합 라이브러리", "https://opencv.org");
const skimage = L("scikit-image", "Python", "NumPy 배열용 영상 처리", "https://scikit-image.org");
const ndimage = L("scipy.ndimage", "Python", "N차원 배열 필터·형태학 연산", "https://docs.scipy.org/doc/scipy/reference/ndimage.html");
const open3d = L("Open3D", "Python·C++", "점 구름·메시 처리", "https://www.open3d.org");
const cornerstone = L("Cornerstone3D", "JS", "웹 의료 영상 뷰어 엔진 (OHIF 의 바탕)", "https://www.cornerstonejs.org");
const niivue = L("NiiVue", "JS", "가벼운 웹 뇌영상·볼륨 뷰어", gh("niivue/niivue"));
const pyvista = L("PyVista", "Python", "파이썬다운 VTK", "https://pyvista.org");

export const libs: Record<string, Lib[]> = {
  // ── 마우스·포인터 ──
  "hover-card": [radix("HoverCard"), floatingUi],
  tooltip: [floatingUi, radix("Tooltip"), L("Tippy.js", "JS", "설정만으로 쓰는 툴팁·팝오버", "https://atomiks.github.io/tippyjs/")],
  "hover-intent": [floatingUi, L("hoverIntent", "jQuery", "커서가 멈출 때만 반응하게 하는 고전 플러그인", "https://briancherne.github.io/jquery-hoverIntent/")],
  "scrubby-slider": [
    L("Tweakpane", "JS", "숫자를 끌어 바꾸는 작은 설정 패널", "https://tweakpane.github.io/docs/"),
    L("Leva", "React", "React 용 조절 패널. 3D 작업에 많이 씀", gh("pmndrs/leva")),
    L("lil-gui", "JS", "dat.gui 후속. Three.js 예제의 그 패널", gh("georgealways/lil-gui")),
  ],
  "drag-and-drop": [
    L("dnd kit", "React", "가볍고 접근성 갖춘 React 드래그 앤 드롭", "https://dndkit.com"),
    L("SortableJS", "JS", "목록 순서 바꾸기를 몇 줄로", gh("SortableJS/Sortable")),
    L("Pragmatic drag and drop", "JS", "Atlassian(Trello·Jira) 이 쓰는 저수준 드래그 앤 드롭", gh("atlassian/pragmatic-drag-and-drop")),
  ],
  "drag-handle": [L("dnd kit", "React", "핸들만 잡고 끌게 하는 기능 내장", "https://dndkit.com"), L("SortableJS", "JS", "handle 옵션으로 손잡이 지정", gh("SortableJS/Sortable"))],
  "context-menu": [radix("ContextMenu"), L("React Aria Menu", "React", "Adobe 의 접근성 중심 메뉴", "https://react-spectrum.adobe.com/react-aria/Menu.html")],
  "click-outside": [floatingUi, L("usehooks-ts useOnClickOutside", "React", "바깥 클릭 감지 훅", "https://usehooks-ts.com")],

  // ── 터치·제스처 ──
  swipe: [L("@use-gesture", "JS·React", "끌기·핀치·스와이프 제스처를 값으로 받기", gh("pmndrs/use-gesture")), swiper],
  "swipe-dismiss": [L("@use-gesture", "JS·React", "끌기 속도·방향으로 닫을지 판단", gh("pmndrs/use-gesture")), motion],
  "pinch-zoom": [
    L("panzoom", "JS", "요소에 확대·이동 붙이기", gh("timmywil/panzoom")),
    L("react-zoom-pan-pinch", "React", "React 용 확대·이동·핀치", gh("BetterTyped/react-zoom-pan-pinch")),
    L("@use-gesture", "JS·React", "핀치 값을 직접 받아 처리", gh("pmndrs/use-gesture")),
  ],
  "rubber-band": [motion, reactSpring],

  // ── 입력 컨트롤 ──
  slider: [radix("Slider"), L("noUiSlider", "JS", "범위(두 손잡이) 슬라이더", "https://refreshless.com/nouislider/")],
  combobox: [
    L("Downshift", "React", "자동완성·콤보박스 동작만 주는 훅", gh("downshift-js/downshift")),
    L("React Select", "React", "검색·다중 선택 되는 셀렉트 완성품", "https://react-select.com"),
    headless,
  ],
  "date-picker": [
    L("React DayPicker", "React", "가볍고 고치기 쉬운 달력", "https://daypicker.dev"),
    L("flatpickr", "JS", "의존성 없는 날짜·시간 선택기", "https://flatpickr.js.org"),
    L("date-fns", "JS", "날짜 계산·형식 바꾸기 (선택기와 짝)", "https://date-fns.org"),
  ],
  "color-picker": [L("react-colorful", "React", "2KB 짜리 색상 선택기", gh("omgovich/react-colorful")), L("Pickr", "JS", "프레임워크 없이 쓰는 색상 선택기", gh("simonwep/pickr"))],
  "file-dropzone": [
    L("react-dropzone", "React", "드롭 영역 훅", "https://react-dropzone.js.org"),
    L("Uppy", "JS", "끌어 놓기·이어 올리기·클라우드 가져오기까지", "https://uppy.io"),
    L("FilePond", "JS", "미리보기·이미지 편집 붙은 업로더", "https://pqina.nl/filepond/"),
  ],
  "masked-input": [L("IMask", "JS", "전화번호·카드번호 입력 마스크", "https://imask.js.org"), L("react-number-format", "React", "천 단위 쉼표·통화 형식 입력", gh("s-yadav/react-number-format"))],
  "toggle-switch": [radix("Switch"), headless],
  "segmented-control": [radix("ToggleGroup")],

  // ── 텍스트·편집 ──
  "rich-text": [
    L("Tiptap", "JS·React·Vue", "ProseMirror 를 쉽게 쓰게 한 편집기", "https://tiptap.dev"),
    L("Lexical", "JS·React", "Meta 의 편집기 프레임워크", "https://lexical.dev"),
    L("ProseMirror", "JS", "많은 편집기의 바탕이 되는 엔진", "https://prosemirror.net"),
    L("Slate", "React", "완전히 고쳐 쓸 수 있는 편집기 틀", gh("ianstormtaylor/slate")),
    L("Quill", "JS", "바로 쓰는 고전 리치 텍스트 편집기", "https://quilljs.com"),
  ],
  "multi-cursor": [L("CodeMirror", "JS", "웹 코드 편집기. 멀티 커서 지원", "https://codemirror.net"), L("Monaco Editor", "JS", "VS Code 의 편집기 부분", "https://microsoft.github.io/monaco-editor/")],
  "find-replace": [L("CodeMirror", "JS", "찾기·바꾸기 패널 내장", "https://codemirror.net"), L("Monaco Editor", "JS", "VS Code 와 같은 찾기 위젯", "https://microsoft.github.io/monaco-editor/")],
  "undo-redo": [L("Yjs UndoManager", "JS", "공동 편집에서도 내 것만 되돌리기", "https://docs.yjs.dev"), L("zundo", "React", "Zustand 상태에 실행 취소 붙이기", gh("charkour/zundo")), L("Immer", "JS", "변경 내역(patch)으로 되돌리기 구현", "https://immerjs.github.io/immer/")],

  // ── 피드백 ──
  toast: [
    L("Sonner", "React", "요즘 가장 많이 쓰는 토스트 (shadcn/ui 기본)", "https://sonner.emilkowal.ski"),
    L("react-hot-toast", "React", "가볍고 예쁜 토스트", "https://react-hot-toast.com"),
    L("notistack", "React", "MUI 와 잘 맞는 쌓이는 알림", "https://notistack.com"),
  ],
  "undo-toast": [L("Sonner", "React", "action 버튼으로 '실행 취소' 넣기", "https://sonner.emilkowal.ski")],
  skeleton: [L("react-loading-skeleton", "React", "모양 맞춰 자동으로 늘어나는 스켈레톤", gh("dvtng/react-loading-skeleton"))],
  progress: [L("NProgress", "JS", "페이지 맨 위의 가는 진행 막대", gh("rstacruz/nprogress")), radix("Progress")],
  "optimistic-ui": [tanQuery, L("React useOptimistic", "React", "React 19 내장 낙관적 상태 훅", "https://react.dev/reference/react/useOptimistic"), swr],
  "inline-validation": [
    L("React Hook Form", "React", "다시 그리기 적은 폼 상태 관리", "https://react-hook-form.com"),
    L("Zod", "TS", "스키마로 값 검사 + 타입까지", "https://zod.dev"),
    L("Valibot", "TS", "Zod 와 비슷하지만 훨씬 작음", "https://valibot.dev"),
  ],

  // ── 창·오버레이 ──
  modal: [radix("Dialog"), headless, L("<dialog> 요소", "HTML", "브라우저 내장 모달. showModal() 로 포커스 가두기까지", "https://developer.mozilla.org/docs/Web/HTML/Element/dialog")],
  popover: [floatingUi, radix("Popover"), L("Popover API", "HTML", "popover 속성만으로 뜨는 창", "https://developer.mozilla.org/docs/Web/API/Popover_API")],
  dropdown: [radix("DropdownMenu"), headless],
  drawer: [radix("Dialog"), L("react-modal-sheet", "React", "끌어서 닫는 시트·서랍", gh("Temzasse/react-modal-sheet"))],
  "bottom-sheet": [L("react-modal-sheet", "React", "스냅 지점 있는 바텀 시트", gh("Temzasse/react-modal-sheet")), motion],
  "focus-trap": [L("focus-trap", "JS", "포커스를 영역 안에 가두기", gh("focus-trap/focus-trap")), L("inert 속성", "HTML", "바깥을 통째로 못 누르게", "https://developer.mozilla.org/docs/Web/HTML/Global_attributes/inert")],

  // ── 탐색·레이아웃 ──
  tabs: [radix("Tabs"), headless],
  accordion: [radix("Accordion"), headless, L("<details> 요소", "HTML", "브라우저 내장 펼침·접힘", "https://developer.mozilla.org/docs/Web/HTML/Element/details")],
  "infinite-scroll": [L("TanStack Query useInfiniteQuery", "React", "다음 쪽 불러오기 상태 관리", "https://tanstack.com/query"), L("react-intersection-observer", "React", "바닥에 닿았는지 감지", gh("thebuilder/react-intersection-observer"))],
  virtualization: [
    L("TanStack Virtual", "JS·React·Vue", "목록·격자 가상 스크롤 엔진", "https://tanstack.com/virtual"),
    L("react-window", "React", "가볍고 단순한 가상 목록", gh("bvaughn/react-window")),
    L("React Virtuoso", "React", "높이가 제각각인 목록·채팅에 강함", "https://virtuoso.dev"),
  ],
  "tree-view": [L("react-arborist", "React", "끌어 옮기기·가상 스크롤 되는 트리", gh("brimdata/react-arborist")), L("React Aria Tree", "React", "키보드 탐색 갖춘 트리", "https://react-spectrum.adobe.com/react-aria/Tree.html")],
  "split-view": [L("react-resizable-panels", "React", "끌어서 크기 바꾸는 패널", gh("bvaughn/react-resizable-panels")), L("Split.js", "JS", "프레임워크 없이 나누기", "https://split.js.org")],
  "command-palette": [L("cmdk", "React", "⌘K 메뉴 부품 (Linear, Vercel)", "https://cmdk.paco.me"), L("kbar", "React", "단축키·검색 붙은 커맨드 바", "https://kbar.vercel.app")],
  routing: [
    L("React Router", "React", "React 라우팅의 표준", "https://reactrouter.com"),
    L("TanStack Router", "React", "주소·검색 파라미터까지 타입 안전", "https://tanstack.com/router"),
    L("Next.js App Router", "React", "폴더 구조가 곧 주소", "https://nextjs.org"),
  ],
  "deep-link": [L("React Router", "React", "주소로 화면 상태 열기", "https://reactrouter.com"), L("Branch", "모바일", "앱 설치 전후까지 이어지는 딥 링크 서비스", "https://www.branch.io")],
  "scroll-snap": [embla, L("CSS scroll-snap", "CSS", "라이브러리 없이 칸 맞춰 멈추기", "https://developer.mozilla.org/docs/Web/CSS/scroll-snap-type")],
  parallax: [gsap, L("Lenis", "JS", "부드러운 스크롤 (패럴랙스와 짝)", "https://lenis.darkroom.engineering")],
  onboarding: [L("Driver.js", "JS", "가볍게 화면 둘러보기·강조", "https://driverjs.com"), L("Shepherd.js", "JS", "단계별 안내 투어", "https://shepherdjs.dev"), L("React Joyride", "React", "React 용 투어", gh("gilbarbara/react-joyride"))],
  "mega-menu": [radix("NavigationMenu")],

  // ── 이미지 ──
  "before-after-slider": [L("img-comparison-slider", "Web Component", "프레임워크 상관없는 비교 슬라이더", gh("sneas/img-comparison-slider")), L("react-compare-slider", "React", "React 비교 슬라이더", gh("nerdyman/react-compare-slider"))],
  "pixel-diff": [L("pixelmatch", "JS", "두 이미지의 다른 픽셀 찾기 (시각 회귀 테스트)", gh("mapbox/pixelmatch")), L("Playwright 스크린샷 비교", "JS", "toHaveScreenshot 으로 화면 차이 검사", "https://playwright.dev/docs/test-snapshots")],
  crop: [L("Cropper.js", "JS", "자르기·회전·비율 고정", "https://fengyuanchen.github.io/cropperjs/"), L("react-easy-crop", "React", "모바일 친화 자르기", gh("ValentinH/react-easy-crop"))],
  "blur-up": [L("BlurHash", "여러 언어", "이미지를 20~30자 문자열로 줄여 흐린 미리보기", "https://blurha.sh"), L("ThumbHash", "JS", "BlurHash 보다 색·비율이 정확", "https://evanw.github.io/thumbhash/")],
  "responsive-image": [L("sharp", "Node", "서버에서 크기별 이미지 만들기", "https://sharp.pixelplumbing.com"), L("Next.js Image", "React", "srcset·지연 로딩 자동", "https://nextjs.org/docs/app/api-reference/components/image")],
  "magnifier-loupe": [L("Drift", "JS", "상품 사진 돋보기 확대", gh("imgix/drift"))],

  // ── 영상 ──
  "adaptive-streaming": [
    L("hls.js", "JS", "크롬·파이어폭스에서 HLS 재생", gh("video-dev/hls.js")),
    L("Shaka Player", "JS", "구글의 DASH·HLS·DRM 플레이어", gh("shaka-project/shaka-player")),
    L("dash.js", "JS", "MPEG-DASH 참고 구현", gh("Dash-Industry-Forum/dash.js")),
  ],
  "seek-preview": [L("Video.js", "JS", "플러그인 많은 오래된 웹 플레이어", "https://videojs.com"), L("Vidstack", "JS·React", "썸네일 미리보기 내장 현대 플레이어", "https://vidstack.io")],
  "chapter-markers": [L("Vidstack", "JS·React", "WebVTT 챕터 표시", "https://vidstack.io"), L("Plyr", "JS", "깔끔한 기본 UI 플레이어", "https://plyr.io")],
  captions: [L("Video.js", "JS", "WebVTT 자막·스타일 설정", "https://videojs.com"), L("Whisper", "Python", "음성에서 자막 자동 생성", gh("openai/whisper"))],
  "poster-frame": [L("FFmpeg", "CLI", "영상에서 한 장 뽑기·변환의 만능 도구", "https://ffmpeg.org")],

  // ── 갤러리 ──
  lightbox: [L("PhotoSwipe", "JS", "핀치 줌 되는 모바일 친화 라이트박스", "https://photoswipe.com"), L("Yet Another React Lightbox", "React", "플러그인식 React 라이트박스", "https://yet-another-react-lightbox.com"), L("GLightbox", "JS", "영상까지 되는 가벼운 라이트박스", gh("biati-digital/glightbox"))],
  carousel: [embla, swiper, L("Splide", "JS", "접근성 신경 쓴 슬라이더", "https://splidejs.com")],
  masonry: [L("Masonry", "JS", "벽돌쌓기 레이아웃의 원조", "https://masonry.desandro.com"), L("react-photo-album", "React", "메이슨리·저스티파이드·행 레이아웃", "https://react-photo-album.com")],
  "justified-grid": [L("react-photo-album", "React", "저스티파이드 갤러리", "https://react-photo-album.com"), L("justified-layout", "JS", "Flickr 의 행 맞춤 계산기", gh("flickr/justified-layout"))],
  filmstrip: [embla, swiper],

  // ── 모션 ──
  easing: [motion, gsap, L("CSS easing 함수", "CSS", "cubic-bezier·linear() 로 직접", "https://developer.mozilla.org/docs/Web/CSS/easing-function")],
  "spring-animation": [reactSpring, motion, L("Popmotion", "JS", "스프링·관성 계산만 하는 작은 라이브러리", gh("Popmotion/popmotion"))],
  "micro-interaction": [L("Lottie", "여러 플랫폼", "After Effects 애니메이션을 JSON 으로 재생", "https://airbnb.io/lottie/"), L("Rive", "여러 플랫폼", "상태에 따라 반응하는 인터랙티브 애니메이션", "https://rive.app"), L("AutoAnimate", "JS", "한 줄로 추가·삭제·이동 애니메이션", "https://auto-animate.formkit.com")],
  "shared-element": [L("View Transitions API", "브라우저", "화면 전환 사이 같은 요소를 이어 주는 내장 기능", "https://developer.mozilla.org/docs/Web/API/View_Transition_API"), motion],
  morphing: [L("Flubber", "JS", "모양이 다른 SVG 끼리 부드럽게 바꾸기", gh("veltman/flubber")), gsap],
  interruptible: [motion, reactSpring],
  "scroll-animation": [gsap, motion, L("Lenis", "JS", "부드러운 스크롤", "https://lenis.darkroom.engineering"), L("CSS scroll-driven animations", "CSS", "animation-timeline 으로 JS 없이", "https://developer.mozilla.org/docs/Web/CSS/animation-timeline")],
  "reduced-motion": [motion, L("prefers-reduced-motion", "CSS", "OS 설정을 읽는 미디어 쿼리", "https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion")],
  "layout-shift": [L("web-vitals", "JS", "CLS 를 실제 사용자에게서 재기", gh("GoogleChrome/web-vitals"))],

  // ── 데스크톱 앱 ──
  "always-on-top": [electron, tauri],
  "overlay-window": [electron, tauri],
  "system-tray": [electron, tauri],
  "minimize-to-tray": [electron, tauri],
  "global-hotkey": [electron, tauri],
  "keyboard-shortcut": [L("tinykeys", "JS", "650B 짜리 단축키 등록", gh("jamiebuilds/tinykeys")), L("react-hotkeys-hook", "React", "React 단축키 훅", gh("JohannesKlauss/react-hotkeys-hook")), L("hotkeys-js", "JS", "범위(scope)별 단축키", gh("jaywcjlove/hotkeys-js"))],
  docking: [L("Dockview", "JS·React", "IDE 같은 도킹·탭 레이아웃", "https://dockview.dev"), L("FlexLayout", "React", "끌어서 붙이는 탭 레이아웃", gh("caplin/FlexLayout")), L("Qt", "C++·Python", "QDockWidget 으로 데스크톱 도킹", "https://www.qt.io")],
  autostart: [electron, tauri],
  "auto-update": [L("electron-updater", "Electron", "electron-builder 의 자동 업데이트", "https://www.electron.build/auto-update"), L("Tauri updater", "Tauri", "서명된 업데이트 내려받기", "https://tauri.app"), L("Sparkle", "macOS", "맥 앱 자동 업데이트의 표준", "https://sparkle-project.org")],
  "code-signing": [L("electron-builder", "Electron", "빌드하면서 서명·공증까지", "https://www.electron.build"), L("signtool", "Windows", "윈도우 Authenticode 서명 도구", "https://learn.microsoft.com/windows/win32/seccrypto/signtool")],

  // ── 접근성 ──
  "a11y-general": [
    L("axe-core", "JS", "자동 접근성 검사 엔진 (Lighthouse 도 사용)", gh("dequelabs/axe-core")),
    L("React Aria", "React", "Adobe 의 접근성 기본 동작 훅·부품", "https://react-spectrum.adobe.com/react-aria/"),
    radix("Primitives"),
  ],
  "color-contrast": [L("axe-core", "JS", "대비 부족 자동 탐지", gh("dequelabs/axe-core")), L("Chroma.js", "JS", "색 대비 계산·팔레트 만들기", "https://gka.github.io/chroma.js/")],
  "focus-ring": [L(":focus-visible", "CSS", "키보드로 왔을 때만 테두리", "https://developer.mozilla.org/docs/Web/CSS/:focus-visible"), L("React Aria useFocusRing", "React", "포커스 링 표시 여부 훅", "https://react-spectrum.adobe.com/react-aria/useFocusRing.html")],
  "roving-tabindex": [radix("Primitives"), L("React Aria", "React", "목록·그리드 키보드 탐색 내장", "https://react-spectrum.adobe.com/react-aria/")],
  "aria-live": [L("@react-aria/live-announcer", "React", "화면 읽기 프로그램에 알림 보내기", "https://react-spectrum.adobe.com/react-aria/")],

  // ── 성능·동작 패턴 ──
  debounce: [L("lodash.debounce", "JS", "가장 많이 쓰는 디바운스", "https://lodash.com/docs#debounce"), L("es-toolkit", "JS", "lodash 를 더 작고 빠르게 (토스)", gh("toss/es-toolkit")), L("use-debounce", "React", "React 디바운스 훅", gh("xnimorz/use-debounce"))],
  throttle: [L("lodash.throttle", "JS", "가장 많이 쓰는 스로틀", "https://lodash.com/docs#throttle"), L("es-toolkit", "JS", "lodash 대체", gh("toss/es-toolkit"))],
  "lazy-loading": [L("loading=\"lazy\"", "HTML", "이미지·iframe 지연 로딩 내장", "https://developer.mozilla.org/docs/Web/Performance/Lazy_loading"), L("React.lazy", "React", "컴포넌트를 필요할 때 불러오기", "https://react.dev/reference/react/lazy")],
  prefetch: [L("quicklink", "JS", "화면에 보이는 링크를 미리 받기", gh("GoogleChromeLabs/quicklink")), L("Speculation Rules API", "브라우저", "다음 페이지 미리 렌더링", "https://developer.mozilla.org/docs/Web/API/Speculation_Rules_API")],
  caching: [tanQuery, swr, L("Workbox", "JS", "서비스 워커 캐시 전략 모음", "https://developer.chrome.com/docs/workbox")],
  memoization: [L("React useMemo·memo", "React", "다시 계산·다시 그리기 건너뛰기", "https://react.dev/reference/react/useMemo"), L("React Compiler", "React", "메모이제이션을 자동으로", "https://react.dev/learn/react-compiler"), L("Reselect", "JS", "Redux 셀렉터 메모이제이션", gh("reduxjs/reselect"))],
  "code-splitting": [vite, L("webpack", "JS", "동적 import 로 청크 나누기의 원조", "https://webpack.js.org"), L("React.lazy", "React", "컴포넌트 단위 나누기", "https://react.dev/reference/react/lazy")],
  hydration: [L("Next.js", "React", "SSR·RSC·부분 하이드레이션", "https://nextjs.org"), L("Astro", "JS", "필요한 섬(island)만 하이드레이션", "https://astro.build"), L("Qwik", "JS", "하이드레이션 대신 이어 실행(resumability)", "https://qwik.dev")],
  "tree-shaking": [L("Rollup", "JS", "트리 셰이킹을 대중화한 번들러", "https://rollupjs.org"), L("esbuild", "Go·JS", "아주 빠른 번들·압축", "https://esbuild.github.io")],
  compression: [L("Terser", "JS", "자바스크립트 압축", "https://terser.org"), L("esbuild", "Go·JS", "빠른 압축", "https://esbuild.github.io"), L("Lightning CSS", "Rust·JS", "CSS 압축·변환", "https://lightningcss.dev")],
  cdn: [L("Cloudflare", "서비스", "무료 요금제가 있는 대형 CDN", "https://www.cloudflare.com"), L("jsDelivr", "서비스", "npm 패키지를 바로 CDN 으로", "https://www.jsdelivr.com")],
  "critical-css": [L("Beasties", "JS", "첫 화면 CSS 를 인라인으로 (Critters 후속)", gh("danielroe/beasties"))],
  "font-loading": [L("Fontsource", "npm", "웹폰트를 npm 패키지로 직접 호스팅", "https://fontsource.org"), L("glyphhanger", "CLI", "쓰는 글자만 남기는 서브셋", gh("zachleat/glyphhanger"))],
  "rendering-modes": [L("Next.js", "React", "CSR·SSR·SSG·ISR 을 페이지마다", "https://nextjs.org"), L("Astro", "JS", "정적 사이트 중심", "https://astro.build"), L("Nuxt", "Vue", "Vue 의 SSR 프레임워크", "https://nuxt.com"), L("SvelteKit", "Svelte", "Svelte 의 앱 프레임워크", "https://svelte.dev/docs/kit")],

  // ── 렌더링·성능 측정 ──
  "web-worker": [L("Comlink", "JS", "워커를 함수 부르듯 쓰기", gh("GoogleChromeLabs/comlink")), L("Partytown", "JS", "서드파티 스크립트를 워커로", "https://partytown.qwik.dev")],
  "frame-budget": [L("stats.js", "JS", "FPS·프레임 시간 표시 (Three.js 예제)", gh("mrdoob/stats.js"))],
  "core-web-vitals": [L("web-vitals", "JS", "LCP·INP·CLS 재기", gh("GoogleChrome/web-vitals")), L("Lighthouse", "도구", "페이지 성능 점수", "https://developer.chrome.com/docs/lighthouse")],
  profiling: [L("Chrome DevTools Performance", "도구", "무엇이 느린지 타임라인으로", "https://developer.chrome.com/docs/devtools/performance"), L("React DevTools Profiler", "React", "어느 컴포넌트가 다시 그려지나", "https://react.dev/learn/react-developer-tools"), L("py-spy", "Python", "실행 중인 파이썬 프로파일링", gh("benfred/py-spy"))],
  "memory-leak": [L("MemLab", "JS", "Meta 의 메모리 누수 자동 탐지", "https://facebook.github.io/memlab/"), L("Chrome DevTools Memory", "도구", "힙 스냅샷 비교", "https://developer.chrome.com/docs/devtools/memory")],
  "bundle-analysis": [L("rollup-plugin-visualizer", "Vite·Rollup", "번들 크기 지도", gh("btd/rollup-plugin-visualizer")), L("webpack-bundle-analyzer", "webpack", "번들 크기 지도", gh("webpack-contrib/webpack-bundle-analyzer")), L("bundlephobia", "웹", "패키지 설치 전 크기 확인", "https://bundlephobia.com")],

  // ── 데이터·네트워크 ──
  websocket: [L("Socket.IO", "JS", "재연결·방(room) 이 붙은 웹소켓", "https://socket.io"), L("ws", "Node", "가볍고 빠른 웹소켓 서버", gh("websockets/ws"))],
  realtime: [
    L("Yjs", "JS", "CRDT 로 충돌 없이 동시 편집", "https://yjs.dev"),
    L("Automerge", "JS·Rust", "로컬 우선 CRDT 문서", "https://automerge.org"),
    L("Liveblocks", "서비스", "커서·댓글·공동 편집 서비스", "https://liveblocks.io"),
    L("Firebase", "서비스", "실시간 데이터베이스", "https://firebase.google.com"),
  ],
  polling: [tanQuery, swr],
  "retry-backoff": [L("p-retry", "JS", "지수 백오프 재시도", gh("sindresorhus/p-retry")), tanQuery, L("tenacity", "Python", "파이썬 재시도 데코레이터", gh("jd/tenacity"))],
  "rate-limit": [L("Bottleneck", "JS", "요청 속도 제한·대기열", gh("SGrondin/bottleneck")), L("express-rate-limit", "Node", "서버 쪽 요청 제한", gh("express-rate-limit/express-rate-limit"))],
  "offline-first": [L("Workbox", "JS", "서비스 워커로 오프라인 캐시", "https://developer.chrome.com/docs/workbox"), L("Dexie.js", "JS", "IndexedDB 를 쉽게", "https://dexie.org"), L("RxDB", "JS", "동기화 되는 로컬 DB", "https://rxdb.info")],
  "request-dedup": [tanQuery, swr, L("DataLoader", "JS", "같은 틱 요청을 묶어 한 번에", gh("graphql/dataloader"))],
  overfetching: [L("GraphQL", "명세", "필요한 필드만 요청", "https://graphql.org"), L("Apollo Client", "JS", "GraphQL 클라이언트·캐시", "https://www.apollographql.com/docs/react/"), L("tRPC", "TS", "타입 그대로 서버 함수 부르기", "https://trpc.io")],
  "n-plus-one": [L("DataLoader", "JS", "N 번 요청을 1 번으로 묶기", gh("graphql/dataloader")), L("Prisma", "TS", "include 로 관계 한 번에 불러오기", "https://www.prisma.io")],
  sse: [L("EventSource", "브라우저", "서버 전송 이벤트 내장 API", "https://developer.mozilla.org/docs/Web/API/EventSource")],

  // ── 개발 흐름·배포 ──
  "hot-reload": [vite, L("React Fast Refresh", "React", "상태 유지하며 컴포넌트 교체", "https://reactnative.dev/docs/fast-refresh")],
  "dev-server": [vite, L("webpack-dev-server", "webpack", "webpack 개발 서버", gh("webpack/webpack-dev-server"))],
  bundler: [vite, L("webpack", "JS", "가장 오래 널리 쓰인 번들러", "https://webpack.js.org"), L("Rspack", "Rust", "webpack 호환 빠른 번들러", "https://rspack.rs"), L("esbuild", "Go", "아주 빠른 번들러", "https://esbuild.github.io")],
  "feature-flag": [L("Unleash", "오픈소스", "직접 운영하는 기능 플래그", "https://www.getunleash.io"), L("GrowthBook", "오픈소스", "플래그 + A/B 테스트", "https://www.growthbook.io"), L("LaunchDarkly", "서비스", "기업용 기능 플래그", "https://launchdarkly.com")],
  "ab-test": [L("GrowthBook", "오픈소스", "통계 분석까지", "https://www.growthbook.io"), L("PostHog", "오픈소스", "분석·실험·세션 녹화", "https://posthog.com")],
  canary: [L("Argo Rollouts", "Kubernetes", "카나리·블루그린 배포", "https://argoproj.github.io/rollouts/"), L("Flagger", "Kubernetes", "지표 보며 자동 카나리", "https://flagger.app")],
  "staged-rollout": [L("Unleash", "오픈소스", "비율로 천천히 켜기", "https://www.getunleash.io"), L("Firebase Remote Config", "서비스", "앱 설정 단계적 배포", "https://firebase.google.com/docs/remote-config")],
  semver: [L("Changesets", "JS", "변경 기록 모아 버전 올리기", gh("changesets/changesets")), L("semantic-release", "JS", "커밋 메시지로 버전 자동 결정", gh("semantic-release/semantic-release"))],
  changelog: [L("release-please", "GitHub", "컨벤셔널 커밋으로 릴리스 PR 자동", gh("googleapis/release-please")), L("Changesets", "JS", "모노레포 체인지로그", gh("changesets/changesets"))],
  "ci-cd": [L("GitHub Actions", "서비스", "저장소에 붙은 CI/CD", "https://github.com/features/actions"), L("GitLab CI", "서비스", "GitLab 내장 파이프라인", "https://docs.gitlab.com/ci/"), L("Jenkins", "오픈소스", "직접 운영하는 CI 서버", "https://www.jenkins.io")],
  linting: [
    L("ESLint", "JS", "자바스크립트 린터의 표준", "https://eslint.org"),
    L("Prettier", "JS", "코드 자동 정리", "https://prettier.io"),
    L("Biome", "Rust", "린트+포맷을 하나로, 아주 빠름", "https://biomejs.dev"),
    L("Ruff", "Python", "파이썬 린트·포맷, 아주 빠름", "https://docs.astral.sh/ruff/"),
  ],
  monorepo: [L("pnpm workspaces", "JS", "패키지 여러 개를 한 저장소에", "https://pnpm.io/workspaces"), L("Turborepo", "JS", "빌드 캐시·병렬 실행", "https://turborepo.com"), L("Nx", "JS", "큰 모노레포 관리 도구", "https://nx.dev")],
  i18n: [L("i18next", "JS", "가장 많이 쓰는 번역 라이브러리 (react-i18next)", "https://www.i18next.com"), L("FormatJS", "JS", "ICU 메시지·날짜·숫자 형식 (react-intl)", "https://formatjs.github.io"), L("Intl API", "브라우저", "날짜·숫자·통화 형식 내장", "https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl")],
  "fuzzy-search": [L("Fuse.js", "JS", "가벼운 퍼지 검색", "https://www.fusejs.io"), L("uFuzzy", "JS", "작고 빠른 퍼지 검색", gh("leeoniya/uFuzzy")), L("fzf", "CLI", "터미널 퍼지 찾기", gh("junegunn/fzf")), L("es-hangul", "JS", "한글 초성 검색 (토스)", gh("toss/es-hangul"))],

  // ── 3D 그래픽·과학 시각화 ──
  vtk: [vtk, L("VTK 예제 모음", "문서", "언어별 예제 수백 개", "https://examples.vtk.org"), pyvista],
  "vtk-pipeline": [vtk, L("ParaView", "앱", "파이프라인을 눌러서 만들기", "https://www.paraview.org")],
  paraview: [L("ParaView", "앱·Python", "공식 사이트", "https://www.paraview.org"), L("VisIt", "앱", "비슷한 대용량 과학 시각화 프로그램", "https://visit-dav.github.io/visit-website/")],
  pyvista: [pyvista, L("vedo", "Python", "과학 3D 시각화·분석", "https://vedo.embl.es"), L("Mayavi", "Python", "예전부터 쓰던 VTK 기반 3D", gh("enthought/mayavi"))],
  vtkjs: [vtkjs, L("trame", "Python", "파이썬으로 웹 시각화 앱", "https://kitware.github.io/trame/"), L("itk-wasm", "JS·Python", "ITK 를 WebAssembly 로", "https://wasm.itk.org")],
  threejs: [three, L("React Three Fiber", "React", "Three.js 를 React 컴포넌트로", "https://r3f.docs.pmnd.rs"), L("drei", "React", "R3F 용 도우미 모음 (카메라·로더 등)", gh("pmndrs/drei"))],
  babylonjs: [L("Babylon.js", "JS", "공식 사이트·플레이그라운드", "https://www.babylonjs.com"), L("PlayCanvas", "JS", "웹 게임 엔진·편집기", "https://playcanvas.com"), L("A-Frame", "HTML", "태그로 만드는 웹 VR", "https://aframe.io")],
  "webgl-webgpu": [L("regl", "JS", "WebGL 을 함수형으로 간단히", gh("regl-project/regl")), L("TWGL", "JS", "WebGL 반복 코드 줄이기", "https://twgljs.org"), L("wgpu", "Rust", "WebGPU 표준의 네이티브 구현", "https://wgpu.rs"), L("PixiJS", "JS", "WebGL·WebGPU 2D 렌더러", "https://pixijs.com")],
  shader: [L("Shadertoy", "웹", "셰이더 연습장·예제 모음", "https://www.shadertoy.com"), L("The Book of Shaders", "문서", "프래그먼트 셰이더 입문서", "https://thebookofshaders.com"), three],
  "scene-graph": [three, L("Babylon.js", "JS", "씬·노드 계층", "https://www.babylonjs.com"), L("OpenSceneGraph", "C++", "데스크톱 씬 그래프 라이브러리", "https://openscenegraph.github.io/openscenegraph.io/")],
  mesh: [L("trimesh", "Python", "메시 읽기·검사·불리언", "https://trimesh.org"), L("CGAL", "C++", "정밀한 계산 기하 알고리즘", "https://www.cgal.org"), L("libigl", "C++·Python", "연구용 메시 처리", "https://libigl.github.io"), L("MeshLab", "앱", "메시 정리·변환 프로그램", "https://www.meshlab.net")],
  "point-cloud": [open3d, L("PCL", "C++", "점 구름 처리 고전", "https://pointclouds.org"), L("Potree", "JS", "수십억 점 웹 뷰어", gh("potree/potree")), L("PDAL", "C++·Python", "라이다 데이터 변환 파이프라인", "https://pdal.io")],
  "open3d-pcl": [open3d, L("PCL", "C++", "Point Cloud Library", "https://pointclouds.org"), L("CloudCompare", "앱", "점 구름 비교·편집 프로그램", "https://www.cloudcompare.org")],
  "volume-rendering": [vtk, vtkjs, slicer, niivue],
  isosurface: [L("VTK vtkFlyingEdges3D", "C++·Python", "빠른 병렬 등치면 추출", "https://vtk.org"), L("skimage.measure.marching_cubes", "Python", "NumPy 볼륨에서 바로 메시", "https://scikit-image.org"), pyvista],
  colormap: [L("Matplotlib colormaps", "Python", "viridis 등 표준 컬러맵", "https://matplotlib.org/stable/users/explain/colors/colormaps.html"), L("colorcet", "Python", "밝기가 고른 컬러맵 모음", "https://colorcet.holoviz.org"), L("d3-scale-chromatic", "JS", "웹용 컬러맵", gh("d3/d3-scale-chromatic")), L("cmocean", "Python", "해양·지구과학용 컬러맵", "https://matplotlib.org/cmocean/")],
  "clipping-plane": [vtk, L("ParaView", "앱", "Clip·Slice 필터", "https://www.paraview.org"), three],
  "orbit-controls": [L("Three.js OrbitControls", "JS", "기본 오빗 카메라", "https://threejs.org/docs/#examples/en/controls/OrbitControls"), L("camera-controls", "JS", "부드럽게 움직이는 Three.js 카메라", gh("yomotsu/camera-controls")), vtk],
  picking: [L("Three.js Raycaster", "JS", "광선으로 물체 찾기", "https://threejs.org/docs/#api/en/core/Raycaster"), L("three-mesh-bvh", "JS", "큰 메시도 빠른 레이캐스트", gh("gkjohnson/three-mesh-bvh")), vtk],
  "lod-3d": [L("meshoptimizer", "C++·JS", "메시 단순화·압축", "https://meshoptimizer.org"), L("3D Tiles", "명세", "큰 3D 데이터를 타일로 나눠 스트리밍", gh("CesiumGS/3d-tiles")), L("Potree", "JS", "점 구름 LOD 뷰어", gh("potree/potree"))],
  gltf: [L("glTF Transform", "JS", "glTF 최적화·압축 도구", "https://gltf-transform.dev"), L("Draco", "C++·JS", "구글의 메시 압축", gh("google/draco")), L("gltfjsx", "React", "glTF 를 R3F 컴포넌트로", gh("pmndrs/gltfjsx")), L("Blender", "앱", "모델 만들고 glTF 로 내보내기", "https://www.blender.org")],

  // ── 의료 영상·이미지 처리 ──
  itk: [itk, sitk, L("ITK-SNAP", "앱", "ITK 로 만든 분할 프로그램", "http://www.itksnap.org")],
  simpleitk: [sitk, L("pydicom", "Python", "DICOM 읽기·쓰기", "https://pydicom.github.io"), L("nibabel", "Python", "NIfTI 등 뇌영상 형식", "https://nipy.org/nibabel/")],
  slicer: [slicer, L("ITK-SNAP", "앱", "분할 전용 가벼운 프로그램", "http://www.itksnap.org"), L("MITK", "C++·앱", "의료 영상 앱 프레임워크", "https://www.mitk.org"), L("Horos", "macOS", "맥 무료 DICOM 뷰어", "https://horosproject.org")],
  dicom: [L("pydicom", "Python", "DICOM 읽기·쓰기", "https://pydicom.github.io"), L("DCMTK", "C++", "DICOM 도구 모음 (전송·변환)", "https://dicom.offis.de/dcmtk"), L("dcmjs", "JS", "브라우저에서 DICOM 다루기", gh("dcmjs-org/dcmjs")), L("highdicom", "Python", "분할·측정 결과를 DICOM 으로", gh("ImagingDataCommons/highdicom"))],
  nifti: [L("nibabel", "Python", "NIfTI 읽기·쓰기", "https://nipy.org/nibabel/"), sitk, niivue],
  pacs: [L("Orthanc", "C++", "가벼운 오픈소스 DICOM 서버", "https://www.orthanc-server.com"), L("dcm4chee", "Java", "대규모 오픈소스 PACS", gh("dcm4che/dcm4chee-arc-light")), L("OHIF Viewer", "JS", "PACS 에 붙이는 웹 뷰어", "https://ohif.org")],
  "window-level": [cornerstone, slicer, niivue],
  mpr: [slicer, cornerstone, niivue, vtkjs],
  segmentation: [
    L("nnU-Net", "Python", "데이터만 넣으면 설정이 맞춰지는 분할 모델", gh("MIC-DKFZ/nnUNet")),
    L("TotalSegmentator", "Python", "CT 장기 100여 개 자동 분할", gh("wasserth/TotalSegmentator")),
    L("MONAI", "Python", "의료 영상 딥러닝 도구", "https://monai.io"),
    L("Segment Anything (SAM)", "Python", "클릭 몇 번으로 아무 물체나 분할", gh("facebookresearch/segment-anything")),
    L("ITK-SNAP", "앱", "손 분할·반자동 분할", "http://www.itksnap.org"),
  ],
  registration: [L("elastix", "C++·Python", "ITK 기반 정합 도구", gh("SuperElastix/elastix")), L("ANTs", "C++·Python", "뇌영상 정합의 강자 (ANTsPy)", gh("ANTsX/ANTs")), sitk, L("Open3D ICP", "Python", "점 구름 정합", "https://www.open3d.org")],
  "image-filter": [opencv, itk, ndimage, skimage],
  thresholding: [opencv, skimage, sitk],
  morphology: [opencv, ndimage, skimage, sitk],
  voxel: [sitk, L("TorchIO", "Python", "재샘플링·증강 (딥러닝용)", "https://torchio.readthedocs.io"), L("nibabel", "Python", "affine 행렬로 좌표 다루기", "https://nipy.org/nibabel/")],
  opencv: [opencv, L("opencv.js", "JS", "브라우저용 OpenCV", "https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html"), L("Kornia", "Python", "PyTorch 용 미분 가능한 영상 처리", "https://kornia.readthedocs.io")],
  "scikit-image": [skimage, L("Pillow", "Python", "사진 열기·크기 바꾸기·저장", "https://python-pillow.github.io"), ndimage],
  imagej: [L("Fiji", "앱", "ImageJ + 플러그인 묶음", "https://fiji.sc"), L("napari", "Python", "다차원 영상 뷰어", "https://napari.org"), L("QuPath", "앱", "병리 슬라이드 분석", "https://qupath.github.io"), L("CellProfiler", "앱", "대량 세포 영상 분석", "https://cellprofiler.org")],
  cornerstone: [cornerstone, L("OHIF Viewer", "JS", "완성형 웹 DICOM 뷰어", "https://ohif.org"), niivue, L("dwv", "JS", "가벼운 DICOM 웹 뷰어", gh("ivmartel/dwv"))],
  monai: [L("MONAI", "Python", "공식 사이트", "https://monai.io"), L("TorchIO", "Python", "3D 의료 영상 증강", "https://torchio.readthedocs.io"), L("nnU-Net", "Python", "자동 설정 분할", gh("MIC-DKFZ/nnUNet"))],

  // ── 차트·지도 ──
  d3: [L("D3", "JS", "공식 사이트", "https://d3js.org"), L("Observable", "웹", "D3 예제 노트북", "https://observablehq.com"), L("visx", "React", "D3 계산 + React 그리기 (Airbnb)", "https://airbnb.io/visx/")],
  "chart-libs": [
    L("Chart.js", "JS", "쉽고 가벼운 캔버스 차트", "https://www.chartjs.org"),
    L("Apache ECharts", "JS", "기능 많고 대용량에 강함", "https://echarts.apache.org"),
    L("Recharts", "React", "React 컴포넌트형 차트", "https://recharts.org"),
    L("uPlot", "JS", "수십만 점 시계열을 아주 빠르게", gh("leeoniya/uPlot")),
    L("Highcharts", "JS·상용", "오래된 상용 차트", "https://www.highcharts.com"),
  ],
  plotly: [L("Plotly", "Python·JS·R", "인터랙티브 그래프", "https://plotly.com/python/"), L("Dash", "Python", "Plotly 대시보드 앱", "https://dash.plotly.com"), L("Bokeh", "Python", "파이썬 인터랙티브 시각화", "https://bokeh.org"), L("Streamlit", "Python", "스크립트를 데이터 앱으로", "https://streamlit.io")],
  matplotlib: [L("Matplotlib", "Python", "공식 사이트", "https://matplotlib.org"), L("seaborn", "Python", "통계 그래프", "https://seaborn.pydata.org"), L("ggplot2", "R", "그래픽 문법의 대표", "https://ggplot2.tidyverse.org")],
  vega: [L("Vega-Lite", "JSON·JS", "선언형 차트 문법", "https://vega.github.io/vega-lite/"), L("Altair", "Python", "파이썬에서 쓰는 Vega-Lite", "https://altair-viz.github.io"), L("Observable Plot", "JS", "D3 팀의 간결한 차트", "https://observablehq.com/plot/")],
  deckgl: [L("deck.gl", "JS", "공식 사이트", "https://deck.gl"), L("kepler.gl", "웹·React", "파일 올려 바로 지도 분석", "https://kepler.gl")],
  "map-libs": [L("Leaflet", "JS", "가볍고 쉬운 웹 지도", "https://leafletjs.com"), L("MapLibre GL JS", "JS", "오픈소스 벡터 타일 지도", "https://maplibre.org"), L("OpenLayers", "JS", "GIS 기능 많은 지도", "https://openlayers.org"), L("Mapbox GL JS", "JS·상용", "Mapbox 의 벡터 지도", "https://docs.mapbox.com/mapbox-gl-js/")],
  cesium: [L("CesiumJS", "JS", "공식 사이트", "https://cesium.com/platform/cesiumjs/"), L("Resium", "React", "CesiumJS 를 React 로", "https://resium.reearth.io")],
};
