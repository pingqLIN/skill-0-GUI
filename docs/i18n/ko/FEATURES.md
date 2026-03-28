# Skill-0 Review Studio 기능 설명

## 핵심 기능

- 주 skill 파일과 선택적 context files 를 받는 intake 작업 공간
- 로컬 `skill-0` 저장소가 있을 때 사용하는 canonical parser bridge
- 공개 데모와 외부 리뷰용 standalone fallback parser
- parser 출력 기반 decomposition board
- findings, traceability, risk framing 을 보여주는 dashboard 와 security matrix
- 공개판의 기본 시각화인 경량 semantic review map
- 메모리 내 편집과 `.skill.md` export

## 공개판 범위

- 공개판은 인터랙티브 3D 작업 공간을 제공하지 않음
- 공개판은 server-side persistence, 공유 draft, multi-user review history 를 제공하지 않음
- standalone 전용 배포에서는 canonical parser 와의 완전 동일성을 주장하지 않음
