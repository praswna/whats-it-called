import type { Category } from "./types";

export const categories: Category[] = [
  { id: "pointer", name: "마우스·포인터 동작", blurb: "커서를 올리고, 누르고, 끄는 동작에 붙은 이름들" },
  { id: "touch", name: "터치·제스처", blurb: "손가락으로 하는 동작. 모바일에서 자주 보는 것들" },
  { id: "control", name: "입력 컨트롤", blurb: "값을 고르거나 켜고 끄는 부품들" },
  { id: "text", name: "텍스트·편집", blurb: "글을 쓰고 고치는 곳에서 쓰는 기능" },
  { id: "feedback", name: "피드백·상태 표시", blurb: "지금 무슨 일이 벌어지는지 알려 주는 방법" },
  { id: "overlay", name: "창·오버레이", blurb: "화면 위에 겹쳐 뜨는 것들. 모달, 팝오버, 시트, 서랍" },
  { id: "nav", name: "탐색·레이아웃 구조", blurb: "화면을 나누고, 옮겨 다니고, 긴 목록을 다루는 방식" },
  { id: "image", name: "이미지", blurb: "사진을 자르고, 맞추고, 불러오고, 비교하는 방법" },
  { id: "video", name: "영상", blurb: "재생 바, 자막, 자동 재생처럼 동영상 플레이어에서 보는 것들" },
  { id: "gallery", name: "갤러리", blurb: "사진 여러 장을 늘어놓고, 넘겨 보고, 골라내는 방식" },
  { id: "motion", name: "모션·애니메이션", blurb: "움직임에 붙은 이름. 이징, 스프링, 전환" },
  { id: "desktop", name: "데스크톱 앱", blurb: "창, 트레이, 단축키처럼 윈도우·맥 앱에서 보는 것들" },
  { id: "a11y", name: "접근성·키보드", blurb: "마우스 없이, 또는 화면을 못 보고도 쓸 수 있게 하는 장치" },
  { id: "perf", name: "성능·동작 패턴", blurb: "빠르게 느껴지게 만드는 코드 쪽 기법" },
  { id: "data", name: "데이터·네트워크", blurb: "서버와 주고받을 때 쓰는 방식과 약속" },
  { id: "devflow", name: "개발 흐름·배포", blurb: "코드를 고치고 내보내는 과정에서 쓰는 말" },
];
