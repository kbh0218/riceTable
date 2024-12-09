const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    rating: { 
        type: Number, 
        required: true 
    },
    board: { 
        type: Number, 
        required: true 
    },
    authorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    authorName: { 
        type: String, 
        required: true 
    },
    likes: { 
        type: Number, 
        default: 0 
    },
    dislikes: { 
        type: Number, 
        default: 0 
    },
    // 좋아요/싫어요를 누른 사용자들의 ID를 저장
    likedBy: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    dislikedBy: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    date: { 
        type: Date, 
        default: Date.now 
    }
});

// 인덱스 추가로 검색 성능 향상
ratingSchema.index({ board: 1, date: -1 });
ratingSchema.index({ authorId: 1 });

// 사용자가 이미 좋아요를 눌렀는지 확인하는 메소드
ratingSchema.methods.hasLiked = function(userId) {
    return this.likedBy.includes(userId);
};

// 사용자가 이미 싫어요를 눌렀는지 확인하는 메소드
ratingSchema.methods.hasDisliked = function(userId) {
    return this.dislikedBy.includes(userId);
};

module.exports = mongoose.model('Rating', ratingSchema);