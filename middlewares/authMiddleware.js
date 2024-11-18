// middleware/authMiddleware.js
// const jwt = require('jsonwebtoken');
// const User = require('../models/usersModel');
// const jwtSecret = process.env.JWT_SECRET;

// const protect = async (req, res, next) => {
//   try {
//     let token = req.cookies.token; // JWT 토큰은 쿠키에서 가져옵니다.
    
//     if (!token) {
//       return res.status(401).json({ message: '토큰이 없습니다. 인증이 필요합니다.' });
//     }

//     JWT 토큰 검증
//     const decoded = jwt.verify(token, jwtSecret);

//     사용자 정보 가져오기
//     req.user = await User.findById(decoded.id).select('-password');
//     if (!req.user) {
//       return res.status(401).json({ message: '사용자를 찾을 수 없습니다. 인증이 거부되었습니다.' });
//     }

//     next();
//   } catch (error) {
//     console.error('인증 미들웨어 오류:', error.message);
//     res.status(401).json({ message: '인증에 실패했습니다. 다시 로그인해 주세요.' });
//   }
// };

// module.exports = { protect };