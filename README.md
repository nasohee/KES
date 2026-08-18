# KES

AI 기반 배터리 상태 예측 및 BMS 모니터링 시스템

## 프로젝트 개요

배터리 실측 데이터를 기반으로 Capacity와 SOH 열화 추이를 분석하고,
AI 예측 결과와 BMS 시뮬레이션 데이터를 함께 제공하는 통합 모니터링 시스템입니다.

## 주요 기능

- 배터리 목록 조회
- 배터리 상세 상태 조회
- Cycle별 배터리 실측 데이터 조회
- 실제값과 AI 예측값 기반 열화 추이 비교
- BMS Voltage / Current / Signal 조회
- BMS 현재 상태 및 경보 조회

## 기술 스택

### Backend
- Java 17
- Spring Boot
- Spring Data JPA
- MySQL
- Gradle

### AI
- Python
- pandas
- XGBoost
- PyTorch

### Frontend
- React

### Infrastructure
- Docker
- Docker Compose

## Backend API

| Method | URL | 설명 |
|---|---|---|
| GET | `/api/batteries` | 배터리 목록 조회 |
| GET | `/api/batteries/{batteryId}` | 배터리 상세 조회 |
| GET | `/api/batteries/{batteryId}/measurements` | 배터리 실측 데이터 조회 |
| GET | `/api/batteries/{batteryId}/degradation` | 실제값과 AI 예측값 기반 열화 추이 조회 |
| GET | `/api/bms/data` | BMS 데이터 조회 |
| GET | `/api/bms/status` | BMS 현재 상태 조회 |

## 프로젝트 구조

```text
KES/
├── ai/
├── backend/
├── database/
├── frontend/
├── docker-compose.yml
└── README.md


