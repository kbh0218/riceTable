// controllers/ratingController.js
const Rating = require('../models/ratingModel');
const UserVote = require('../models/UserVote'); // 필요한 경우 투표 제한을 위해 사용

// 평가 생성
exports.createRating = async (req, res) => {
    const { title, content, rating, board } = req.body;

    try {
        // 사용자가 오늘 해당 보드에 이미 평가를 작성했는지 확인
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const existingRating = await Rating.findOne({
            authorId: req.user._id,
            board: board,
            date: {
                $gte: startOfToday,
                $lt: endOfToday
            }
        });

        if (existingRating) {
            return res.status(400).json({ message: '이미 평가하셨습니다.' });
        }

        const newRating = new Rating({
            title,
            content,
            rating,
            board,
            authorId: req.user._id,
            authorName: req.user.name
        });

        const savedRating = await newRating.save();
        res.status(201).json(savedRating);
    } catch (error) {
        console.error('평가 생성 오류:', error);
        res.status(500).json({ message: '평가 생성 중 오류가 발생했습니다.' });
    }
};


// 평가 목록 조회
exports.getRatings = async (req, res) => {
    try {
        const ratings = await Rating.find({ board: req.query.board })
            .populate('authorId', 'name'); // authorId를 populate하여 name을 포함

        // 각 게시글에 authorName 추가
        const ratingsWithAuthor = ratings.map(rating => ({
            ...rating._doc,
            authorName: rating.authorId.name
        }));

        res.json(ratingsWithAuthor);
    } catch (error) {
        console.error('평가 목록 조회 오류:', error);
        res.status(500).json({ message: '평가 목록을 조회하는 중 오류가 발생했습니다.' });
    }
};
// 특정 평가 조회
exports.getRatingById = async (req, res) => {
    try {
        const rating = await Rating.findById(req.params.id);
        if (!rating) {
            return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
        }
        res.json(rating);
    } catch (error) {
        console.error('평가 조회 오류:', error);
        res.status(500).json({ message: '평가 조회 중 오류가 발생했습니다.' });
    }
};

// 평가 삭제 (변경 없음)
exports.deleteRating = async (req, res) => {
    try {
        const rating = await Rating.findById(req.params.id);
        if (!rating) {
            return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
        }

        // 작성자만 삭제 가능
        if (rating.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: '삭제 권한이 없습니다.' });
        }

        await rating.deleteOne();
        res.json({ message: '평가가 삭제되었습니다.' });
    } catch (error) {
        console.error('평가 삭제 오류:', error);
        res.status(500).json({ message: '평가 삭제 중 오류가 발생했습니다.' });
    }
};

exports.likeRating = async (req, res) => {
    try {
        const rating = await Rating.findById(req.params.id);
        if (!rating) {
            return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
        }

        const userId = req.user._id;

        // 이미 좋아요를 눌렀는지 확인
        if (rating.hasLiked(userId)) {
            return res.status(400).json({ message: '이미 좋아요를 누르셨습니다.' });
        }

        // 싫어요를 눌렀던 경우 싫어요 취소
        if (rating.hasDisliked(userId)) {
            rating.dislikedBy.pull(userId);
            rating.dislikes = Math.max(0, rating.dislikes - 1);
        }

        // 좋아요 추가
        rating.likedBy.push(userId);
        rating.likes += 1;
        
        await rating.save();
        
        res.json({ 
            likes: rating.likes,
            dislikes: rating.dislikes,
            message: '좋아요가 추가되었습니다.' 
        });
    } catch (error) {
        console.error('좋아요 추가 오류:', error);
        res.status(500).json({ message: '좋아요 추가 중 오류가 발생했습니다.' });
    }
};

// 싫어요 추가
exports.dislikeRating = async (req, res) => {
    try {
        const rating = await Rating.findById(req.params.id);
        if (!rating) {
            return res.status(404).json({ message: '평가를 찾을 수 없습니다.' });
        }

        const userId = req.user._id;

        // 이미 싫어요를 눌렀는지 확인
        if (rating.hasDisliked(userId)) {
            return res.status(400).json({ message: '이미 싫어요를 누르셨습니다.' });
        }

        // 좋아요를 눌렀던 경우 좋아요 취소
        if (rating.hasLiked(userId)) {
            rating.likedBy.pull(userId);
            rating.likes = Math.max(0, rating.likes - 1);
        }

        // 싫어요 추가
        rating.dislikedBy.push(userId);
        rating.dislikes += 1;
        
        await rating.save();

        res.json({ 
            likes: rating.likes,
            dislikes: rating.dislikes,
            message: '싫어요가 추가되었습니다.' 
        });
    } catch (error) {
        console.error('싫어요 추가 오류:', error);
        res.status(500).json({ message: '싫어요 추가 중 오류가 발생했습니다.' });
    }
};

// 평균 별점 계산
exports.getAverageRating = async (req, res) => {
    try {
        const board = req.query.board;
        const average = await Rating.aggregate([
            { $match: { board: Number(board) } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" }
                }
            }
        ]);

        const avgRating = average.length > 0 ? average[0].averageRating : 0;

        res.json({ averageRating: avgRating });
    } catch (error) {
        console.error('평균 별점 계산 오류:', error);
        res.status(500).json({ message: '평균 별점 계산 중 오류가 발생했습니다.' });
    }
};

// 사용자가 오늘 해당 보드에 평가를 작성했는지 확인하는 엔드포인트
exports.checkUserRatingToday = async (req, res) => {
    try {
        const board = req.query.board;
        const userId = req.user._id;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const existingRating = await Rating.findOne({
            authorId: userId,
            board: board,
            date: {
                $gte: startOfToday,
                $lt: endOfToday
            }
        });

        if (existingRating) {
            return res.json({ hasSubmittedToday: true });
        } else {
            return res.json({ hasSubmittedToday: false });
        }
    } catch (error) {
        console.error('사용자 평가 확인 오류:', error);
        res.status(500).json({ message: '사용자 평가 확인 중 오류가 발생했습니다.' });
    }
};