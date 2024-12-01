class MenuNode {
    constructor(restaurant, name, price, sideDishes) {
        this.restaurant = restaurant;    
        this.name = name;                
        this.price = price;              
        this.sideDishes = sideDishes;    
        this.next = null;                
        this.prev = null;                
    }
}

// 캠퍼스 식당 메뉴 관리를 위한 이중연결리스트 클래스
class CampusRestaurants {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    // 새로운 메뉴 추가
    addMenu(restaurant, name, price, sideDishes) {
        const newNode = new MenuNode(restaurant, name, price, sideDishes);
        
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            newNode.prev = this.tail;
            this.tail = newNode;
        }
        
        this.size++;
    }

    // 특정 식당의 메뉴 삭제
    removeMenu(restaurant) {
        let current = this.head;
        
        while (current) {
            if (current.restaurant === restaurant) {
                if (current === this.head && current === this.tail) {
                    this.head = null;
                    this.tail = null;
                } else if (current === this.head) {
                    this.head = current.next;
                    this.head.prev = null;
                } else if (current === this.tail) {
                    this.tail = current.prev;
                    this.tail.next = null;
                } else {
                    current.prev.next = current.next;
                    current.next.prev = current.prev;
                }
                this.size--;
                return true;
            }
            current = current.next;
        }
        return false;
    }

    // 모든 식당의 오늘 메뉴 정보 반환
    getAllTodayMenus() {
        const menus = {};
        let current = this.head;
        
        while (current) {
            menus[current.restaurant] = {
                name: current.name,
                price: current.price,
                sideDishes: current.sideDishes
            };
            current = current.next;
        }
        
        return menus;
    }

    // 특정 식당의 메뉴 정보 찾기
    findMenu(restaurant) {
        let current = this.head;
        
        while (current) {
            if (current.restaurant === restaurant) {
                return {
                    name: current.name,
                    price: current.price,
                    sideDishes: current.sideDishes
                };
            }
            current = current.next;
        }
        return null;
    }

    // 메뉴 정보 업데이트
    updateMenu(restaurant, newName, newPrice, newSideDishes) {
        let current = this.head;
        
        while (current) {
            if (current.restaurant === restaurant) {
                current.name = newName;
                current.price = newPrice;
                current.sideDishes = newSideDishes;
                return true;
            }
            current = current.next;
        }
        return false;
    }

    // 전체 메뉴 리스트의 크기 반환
    getSize() {
        return this.size;
    }
}

export { CampusRestaurants };
