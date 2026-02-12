# ZEMSTONE 판촉물 SCM 시스템 설계 문서

> v1.0 | 2026-02-12

---

## 1. 시스템 개요

젬스톤(광고 제작사)이 삼성물산 래미안 사업소에 판촉물을 납품·관리하는 SCM 시스템.  
본사(삼성물산)가 차수별로 발주하면 젬스톤이 사업소별로 출고 처리하고, 잔량을 실시간 추적한다.

**핵심 가치**: 잔량 누적 관리 + 권한별 뷰 분리 + 사업소 추가발주 요청 플로우

---

## 2. 기존 시스템 분석

### 현재 기능
- 바닐라 HTML + JS + localStorage 기반 SPA
- 2단계 권한: admin(젬스톤) / user(사업소)
- 대시보드: 총 발주량, 출고 총계, 발주 잔량, 출고율 + 사업소별 진행률
- 발주하기: 사업소 선택 → 품목별 수량 입력 → 발주 확정 (= 출고 처리)
- 차수 관리: 본사 발주 차수 추가/수정/삭제
- 어드민: 사업소 CRUD, 품목 CRUD, 발주 이력 조회/취소
- 잔량 계산: 모든 차수 합산(총 발주량) - 출고 총계 = 잔량

### 데이터 구조 (localStorage)
- `branches`: 사업소 배열 (code, name, address, manager, phone, status)
- `products`: 품목 배열 (code, name, category, unit, price, status)
- `hqOrderData`: { currentRound, rounds: [{ round, date, orders: { productCode: { branchCode: qty } } }] }
- `orderHistory`: [{ id, orders: [{ branch, product, quantity, ... }], specialNotes, submittedBy, submittedAt }]
- `pendingOrders`: 확정 전 임시 발주 목록

### 한계점
1. **localStorage**: 브라우저/기기 간 공유 불가, 데이터 유실 위험
2. **권한 2단계**: 본사(삼성물산) 전용 조회 뷰 없음
3. **인증 없음**: sessionStorage에 하드코딩된 계정, 보안 취약
4. **발주 ≠ 출고 분리 안 됨**: "발주하기"가 곧 출고 처리 → 실제 업무 흐름과 괴리
5. **추가발주 요청/승인 플로우 없음**
6. **알림 기능 없음**
7. **엑셀 다운로드 없음**
8. **사업소 하드코딩**: 대시보드 테이블 헤더에 5개 사업소 고정

---

## 3. 권한/역할 설계

| 역할 | 코드 | 설명 | 접근 범위 |
|------|------|------|-----------|
| 어드민 | `ADMIN` | 젬스톤 관리자 | 모든 기능 (CRUD, 출고 처리, 통계) |
| 본사 | `HQ` | 삼성물산 본사 | 전체 사업소 현황 조회 + 대시보드 (읽기 전용), 추가발주 승인 |
| 사업소 | `BRANCH` | 래미안 사업소 | 본인 사업소 데이터만 조회, 추가발주 요청 |

### 권한 매트릭스

| 기능 | ADMIN | HQ | BRANCH |
|------|-------|----|--------|
| 대시보드 (전체) | ✅ | ✅ | ❌ |
| 대시보드 (내 사업소) | ✅ | ❌ | ✅ |
| 발주 차수 추가/수정/삭제 | ✅ | ❌ | ❌ |
| 출고 처리 | ✅ | ❌ | ❌ |
| 사업소/품목 관리 | ✅ | ❌ | ❌ |
| 추가발주 요청 | ❌ | ❌ | ✅ |
| 추가발주 승인 | ✅ | ✅ | ❌ |
| 엑셀 다운로드 | ✅ | ✅ | ✅ (본인만) |
| 사용자 관리 | ✅ | ❌ | ❌ |

---

## 4. DB 스키마

### users
```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,  -- bcrypt
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(10) NOT NULL CHECK (role IN ('ADMIN','HQ','BRANCH')),
  branch_id   INT REFERENCES branches(id),  -- BRANCH 역할만
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### branches (사업소)
```sql
CREATE TABLE branches (
  id        SERIAL PRIMARY KEY,
  code      VARCHAR(10) UNIQUE NOT NULL,
  name      VARCHAR(100) NOT NULL,
  address   VARCHAR(255),
  manager   VARCHAR(50),
  phone     VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### products (품목)
```sql
CREATE TABLE products (
  id        SERIAL PRIMARY KEY,
  code      VARCHAR(10) UNIQUE NOT NULL,
  name      VARCHAR(100) NOT NULL,
  category  VARCHAR(50),
  unit      VARCHAR(10) DEFAULT '박스',
  price     INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### order_rounds (본사 발주 차수)
```sql
CREATE TABLE order_rounds (
  id          SERIAL PRIMARY KEY,
  round_no    INT NOT NULL,
  order_date  DATE NOT NULL,
  memo        TEXT,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### order_round_items (차수별 발주 상세)
```sql
CREATE TABLE order_round_items (
  id          SERIAL PRIMARY KEY,
  round_id    INT REFERENCES order_rounds(id) ON DELETE CASCADE,
  branch_id   INT REFERENCES branches(id),
  product_id  INT REFERENCES products(id),
  quantity    INT NOT NULL DEFAULT 0,
  UNIQUE(round_id, branch_id, product_id)
);
```

### shipments (출고)
```sql
CREATE TABLE shipments (
  id            SERIAL PRIMARY KEY,
  branch_id     INT REFERENCES branches(id),
  delivery_date DATE,
  notes         TEXT,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### shipment_items (출고 상세)
```sql
CREATE TABLE shipment_items (
  id          SERIAL PRIMARY KEY,
  shipment_id INT REFERENCES shipments(id) ON DELETE CASCADE,
  product_id  INT REFERENCES products(id),
  quantity    INT NOT NULL,
  UNIQUE(shipment_id, product_id)
);
```

### inventory (사업소별 현재 재고 - 캐시 테이블)
```sql
CREATE TABLE inventory (
  id          SERIAL PRIMARY KEY,
  branch_id   INT REFERENCES branches(id),
  product_id  INT REFERENCES products(id),
  total_ordered  INT DEFAULT 0,  -- 모든 차수 합산
  total_shipped  INT DEFAULT 0,  -- 모든 출고 합산
  remaining      INT GENERATED ALWAYS AS (total_ordered - total_shipped) STORED,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);
```

### extra_order_requests (추가 발주 요청)
```sql
CREATE TABLE extra_order_requests (
  id          SERIAL PRIMARY KEY,
  branch_id   INT REFERENCES branches(id),
  product_id  INT REFERENCES products(id),
  quantity    INT NOT NULL,
  reason      TEXT,
  status      VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  requested_by INT REFERENCES users(id),
  reviewed_by  INT REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### alert_thresholds (잔량 알림 기준)
```sql
CREATE TABLE alert_thresholds (
  id          SERIAL PRIMARY KEY,
  branch_id   INT REFERENCES branches(id),
  product_id  INT REFERENCES products(id),
  threshold   INT NOT NULL,  -- 이 수량 이하 시 알림
  UNIQUE(branch_id, product_id)
);
```

### notifications (알림)
```sql
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id),
  type        VARCHAR(30) NOT NULL,  -- LOW_STOCK, EXTRA_ORDER, SHIPMENT
  title       VARCHAR(200),
  message     TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### ER 요약
```
users ──┐
branches ──┤── order_round_items ── order_rounds
products ──┘
branches ──┤── shipment_items ── shipments
products ──┘
branches ──┤── inventory
products ──┘
branches ──┤── extra_order_requests
products ──┘
```

---

## 5. API 엔드포인트

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인 → JWT 반환 |
| POST | `/api/auth/refresh` | 토큰 갱신 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 사용자 (ADMIN)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/users` | 사용자 목록 |
| POST | `/api/users` | 사용자 생성 |
| PUT | `/api/users/:id` | 사용자 수정 |
| DELETE | `/api/users/:id` | 사용자 삭제 |

### 사업소 (ADMIN)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/branches` | 사업소 목록 |
| POST | `/api/branches` | 사업소 추가 |
| PUT | `/api/branches/:id` | 사업소 수정 |
| DELETE | `/api/branches/:id` | 사업소 삭제 |

### 품목 (ADMIN)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/products` | 품목 목록 |
| POST | `/api/products` | 품목 추가 |
| PUT | `/api/products/:id` | 품목 수정 |
| DELETE | `/api/products/:id` | 품목 삭제 |

### 발주 차수 (ADMIN 쓰기 / HQ+ADMIN 읽기)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/rounds` | 차수 목록 |
| GET | `/api/rounds/:id` | 차수 상세 (품목×사업소 매트릭스) |
| POST | `/api/rounds` | 새 차수 추가 |
| PUT | `/api/rounds/:id` | 차수 수정 |
| DELETE | `/api/rounds/:id` | 차수 삭제 |

### 출고 (ADMIN)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/shipments` | 출고 목록 (필터: branch, date) |
| POST | `/api/shipments` | 출고 처리 |
| DELETE | `/api/shipments/:id` | 출고 취소 |

### 재고/대시보드
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/inventory` | 전체 재고 현황 (ADMIN, HQ) |
| GET | `/api/inventory/:branchId` | 사업소별 재고 (BRANCH는 본인만) |
| GET | `/api/dashboard/summary` | 요약 카드 데이터 |
| GET | `/api/dashboard/progress` | 사업소별 소진율 |

### 추가 발주 요청
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/extra-orders` | 요청 목록 (권한별 필터) |
| POST | `/api/extra-orders` | 요청 생성 (BRANCH) |
| PUT | `/api/extra-orders/:id/approve` | 승인 (ADMIN, HQ) |
| PUT | `/api/extra-orders/:id/reject` | 거절 (ADMIN, HQ) |

### 알림
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/notifications` | 내 알림 목록 |
| PUT | `/api/notifications/:id/read` | 읽음 처리 |
| GET | `/api/alert-thresholds` | 기준치 목록 (ADMIN) |
| PUT | `/api/alert-thresholds` | 기준치 설정 (ADMIN) |

### 엑셀
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/export/inventory` | 재고 현황 엑셀 |
| GET | `/api/export/shipments` | 출고 내역 엑셀 |
| GET | `/api/export/rounds/:id` | 차수별 발주 엑셀 |

---

## 6. 페이지/화면 구성

### 공통
- 로그인 페이지
- 사이드바 (권한별 메뉴 필터링)
- 알림 벨 아이콘 + 드롭다운

### ADMIN (젬스톤)
1. **대시보드**: 요약 카드 + 4개 테이블(총 발주량, 발주 잔량, 본사 발주 N차, 출고 총계) + 사업소별 진행률
2. **출고 처리**: 사업소 선택 → 품목별 수량 입력 → 출고 확정
3. **차수 관리**: 차수 추가/수정/삭제, 차수 이력 조회
4. **추가발주 관리**: 요청 목록 + 승인/거절
5. **어드민**: 사업소 CRUD, 품목 CRUD, 사용자 CRUD, 알림 기준치 설정
6. **히스토리**: 전체 출고 이력 (필터: 사업소, 기간)
7. **리포트**: 추이 그래프 + 엑셀 다운로드

### HQ (삼성물산 본사)
1. **대시보드**: ADMIN과 동일 뷰 (읽기 전용)
2. **추가발주 관리**: 요청 목록 + 승인/거절
3. **히스토리**: 전체 출고 이력 (읽기 전용)
4. **리포트**: 추이 그래프 + 엑셀 다운로드

### BRANCH (사업소)
1. **내 현황**: 내 사업소 재고 카드 (품목별 발주량/출고량/잔량) + 소진율
2. **추가발주 요청**: 품목 선택 → 수량/사유 입력 → 요청
3. **내 히스토리**: 내 사업소 출고 이력
4. **엑셀 다운로드**: 내 데이터만

---

## 7. 핵심 비즈니스 로직

### 7.1 재고 계산
```
잔량 = Σ(모든 차수 발주량) - Σ(모든 출고량)
```
- `inventory` 테이블은 캐시. 출고/차수 변경 시 트리거 or 서비스에서 갱신.
- 차수 간 이월: 리셋 없음. 누적 합산.

### 7.2 출고 처리 플로우
1. ADMIN이 사업소+품목별 수량 입력
2. 잔량 >= 출고수량 검증 (경고 후 강제 출고 허용)
3. `shipments` + `shipment_items` INSERT
4. `inventory.total_shipped` 갱신
5. 잔량이 기준치 이하면 알림 생성

### 7.3 추가 발주 요청 플로우
1. BRANCH가 품목+수량+사유 입력 → `extra_order_requests` INSERT (PENDING)
2. HQ/ADMIN에게 알림 발송
3. HQ 또는 ADMIN이 승인 → status = APPROVED
4. ADMIN이 해당 수량을 현재 차수에 반영 (or 새 차수 생성)
5. `inventory.total_ordered` 갱신

### 7.4 알림 로직
- **잔량 부족**: 출고 처리 후 `remaining <= threshold` → ADMIN + 해당 BRANCH에 알림
- **추가발주 요청**: BRANCH가 요청 → HQ + ADMIN에 알림
- **추가발주 결과**: 승인/거절 → 요청한 BRANCH에 알림
- 알림은 DB 저장 + 프론트 폴링 (30초) or SSE

---

## 8. 기술 스택 상세

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프론트엔드 | React 18 + Vite | TypeScript |
| 상태관리 | Zustand | 경량, 충분 |
| UI | Tailwind CSS + shadcn/ui | 모바일 반응형 |
| 차트 | Recharts | 추이 그래프 |
| 엑셀 | SheetJS (xlsx) | 프론트에서 생성 or 백엔드 |
| 라우팅 | React Router v6 | 권한별 라우트 가드 |
| HTTP | Axios | 인터셉터로 JWT 자동 첨부 |
| 백엔드 | Node.js 20 + Express | |
| ORM | Prisma | 타입 안전, 마이그레이션 |
| DB | PostgreSQL 16 | |
| 인증 | JWT (access 15m + refresh 7d) | bcrypt 비밀번호 |
| 검증 | Zod | 요청 바디 검증 |
| 배포(FE) | Vercel | |
| 배포(BE) | Railway or EC2 | Railway 추천 (간편) |
| 배포(DB) | Railway PostgreSQL or Supabase | |

---

## 9. 개발 단계

### Phase 1: 코어 (2주)
- DB 스키마 + Prisma 설정
- 인증 (로그인/JWT/권한 미들웨어)
- 사업소/품목 CRUD API
- 발주 차수 CRUD API
- 출고 처리 API + 재고 계산
- 프론트: 로그인, 대시보드, 출고 처리, 어드민 (기존 UI 마이그레이션)

### Phase 2: 확장 (1.5주)
- 추가 발주 요청/승인 플로우
- 알림 시스템 (DB + 프론트 폴링)
- 잔량 기준치 설정 + 자동 알림
- 히스토리 페이지 (필터, 페이지네이션)
- 엑셀 다운로드
- 사용자 관리 (ADMIN)

### Phase 3: 완성 (1주)
- 추이 그래프 (Recharts)
- 모바일 반응형 최적화
- 에러 핸들링, 로딩 상태
- 테스트 및 버그 픽스
- 배포 + 도메인 연결

---

## 10. 디렉토리 구조

```
zemstone-scm/
├── client/                    # React (Vite)
│   ├── src/
│   │   ├── api/               # Axios 인스턴스 + API 함수
│   │   ├── components/
│   │   │   ├── common/        # Button, Modal, Table, Toast...
│   │   │   ├── dashboard/     # SummaryCard, StockTable, ProgressBar
│   │   │   ├── shipment/      # ShipmentForm, ShipmentHistory
│   │   │   ├── rounds/        # RoundModal, RoundHistory
│   │   │   ├── extra-orders/  # RequestForm, ApprovalList
│   │   │   └── admin/         # BranchForm, ProductForm, UserForm
│   │   ├── hooks/             # useAuth, useInventory, useNotifications
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ShipmentPage.tsx
│   │   │   ├── RoundsPage.tsx
│   │   │   ├── ExtraOrdersPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── ReportPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── store/             # Zustand stores
│   │   ├── guards/            # RoleGuard.tsx
│   │   ├── types/             # TypeScript 타입
│   │   └── App.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
│
├── server/                    # Express
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── branches.ts
│   │   │   ├── products.ts
│   │   │   ├── rounds.ts
│   │   │   ├── shipments.ts
│   │   │   ├── inventory.ts
│   │   │   ├── extra-orders.ts
│   │   │   ├── notifications.ts
│   │   │   └── export.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts        # JWT 검증
│   │   │   ├── role.ts        # 권한 체크
│   │   │   └── validate.ts    # Zod 검증
│   │   ├── services/
│   │   │   ├── inventory.ts   # 재고 계산/갱신
│   │   │   ├── notification.ts # 알림 생성
│   │   │   └── export.ts      # 엑셀 생성
│   │   ├── utils/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── .env.example
├── docker-compose.yml         # 로컬 개발용 (PostgreSQL)
└── README.md
```
