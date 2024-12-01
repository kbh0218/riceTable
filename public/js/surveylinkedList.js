const Survey = require('../../models/Survey');

class Node {
    constructor(restaurantId, date, timeSlot, count) {
        this.restaurantId = restaurantId;
        this.date = date;
        this.timeSlot = timeSlot;
        this.count = count;
        this.prev = null;
        this.next = null;
    }
}

class SurveyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    // MongoDB에서 데이터 로드
    async loadFromMongoDB(restaurantId, date) {
        try {
            const surveys = await Survey.find({ 
                restaurantId: Number(restaurantId),
                date 
            }).sort({ timeSlot: 1 });

            surveys.forEach(survey => {
                this.append(
                    survey.restaurantId,
                    survey.date,
                    survey.timeSlot,
                    survey.count
                );
            });

            return true;
        } catch (error) {
            console.error('MongoDB 데이터 로딩 실패:', error);
            return false;
        }
    }

    // 새로운 투표 데이터 추가
    append(restaurantId, date, timeSlot, count) {
        const newNode = new Node(restaurantId, date, timeSlot, count);
        this.size++;

        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
            return;
        }

        newNode.prev = this.tail;
        this.tail.next = newNode;
        this.tail = newNode;
    }

    // 데이터를 프론트엔드 형식으로 변환
    toResponseFormat() {
        const data = {};
        let current = this.head;
        
        while (current) {
            if (!data[current.date]) {
                data[current.date] = {};
            }
            data[current.date][current.timeSlot] = current.count;
            current = current.next;
        }
        
        return data;
    }

    // 특정 시간대 투표수 증가
    async incrementVote(timeSlot) {
        let current = this.head;
        while (current) {
            if (current.timeSlot === timeSlot) {
                current.count++;
                return current.count;
            }
            current = current.next;
        }
        return null;
    }
}

module.exports = SurveyLinkedList;

