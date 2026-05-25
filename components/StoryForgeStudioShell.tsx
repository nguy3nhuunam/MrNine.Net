"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, PenLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { languageOptions as appLanguageOptions, useLanguage, type WebLanguage } from "@/components/LanguageProvider";

const STUDIO_URL = "/inkos-studio/";
const legacyLanguageOptions = [
  { value: "en", label: "EN", title: "English" },
  { value: "vi", label: "VI", title: "Tiếng Việt" },
] as const;

type StudioState = "starting" | "ready" | "error";
void legacyLanguageOptions;

const studioViText: Record<string, string> = {
  "InkOS": "InkOS",
  "Studio": "Studio",
  "首页": "Trang chủ",
  "书籍": "Sách",
  "新建书籍": "Tạo sách",
  "还没有书": "Chưa có sách",
  "创建第一本书开始写作": "Tạo cuốn sách đầu tiên để bắt đầu",
  "系统": "Hệ thống",
  "工具": "Công cụ",
  "题材": "Thể loại",
  "模型配置": "Cấu hình model",
  "日志": "Nhật ký",
  "文风": "Văn phong",
  "导入": "Nhập dữ liệu",
  "市场雷达": "Radar",
  "环境诊断": "Kiểm tra hệ thống",
  "Radar": "Radar",
  "Model": "Model",
  "Base URL": "Base URL",
  "API Key": "API Key",
  "告诉我你想写什么——题材、世界观、主角、核心冲突": "Hãy cho tôi biết bạn muốn viết gì - thể loại, thế giới quan, nhân vật chính và xung đột cốt lõi",
  "输入指令...": "Nhập chỉ lệnh...",
  "输入指令…": "Nhập chỉ lệnh...",
  "配置模型 →": "Cấu hình model →",
  "åŠ è½½æ¨¡åž‹...": "Äang táº£i model...",
  "åŠ è½½Model...": "Äang táº£i model...",
  "é€‰æ‹©æ¨¡åž‹": "Chá»n model",
  "è¯·å…ˆé€‰æ‹©ä¸€ä¸ªæ¨¡åž‹": "Vui lÃ²ng chá»n model trÆ°á»›c",
  "\u52a0\u8f7d\u6a21\u578b...": "\u0110ang t\u1ea3i model...",
  "\u52a0\u8f7dModel...": "\u0110ang t\u1ea3i model...",
  "\u9009\u62e9\u6a21\u578b": "Ch\u1ecdn model",
  "\u8bf7\u5148\u9009\u62e9\u4e00\u4e2a\u6a21\u578b": "Vui l\u00f2ng ch\u1ecdn model tr\u01b0\u1edbc",
};

const studioViPartialText = [
  ["氛围章", "Chương không khí"],
  ["事件章", "Chương sự kiện"],
  ["揭示章", "Chương hé lộ"],
  ["推进章", "Chương đẩy tiến triển"],
  ["商战章", "Chương thương chiến"],
  ["社交章", "Chương xã giao"],
  ["毛骨悚然", "rợn tóc gáy"],
  ["不寒而栗", "rùng mình"],
  ["浑身发冷", "lạnh sống lưng"],
  ["头皮发麻", "tê da đầu"],
  ["鸡皮疙瘩", "nổi da gà"],
  ["心跳加速", "tim đập nhanh"],
  ["震惊", "kinh ngạc"],
  ["不可思议", "khó tin"],
  ["不可置信", "không thể tin nổi"],
  ["难以置信", "khó mà tin được"],
  ["深吸一口气", "hít sâu một hơi"],
  ["眼中闪过一丝", "trong mắt thoáng qua một tia"],
  ["核心动机", "động cơ cốt lõi"],
  ["信息边界", "ranh giới thông tin"],
  ["轰然炸裂", "nổ tung dữ dội"],
  ["满场死寂", "cả hiện trường chết lặng"],
  ["兑现", "được hiện thực hóa"],
  ["外挂", "lợi thế ngoại lệ"],
  ["已连接", "Đã kết nối"],
  ["氛围递进：安全感→微妙不适→确认异常→恐惧升级→高潮→喘息，循环推进", "Không khí tăng dần: cảm giác an toàn -> khó chịu mơ hồ -> xác nhận bất thường -> nỗi sợ leo thang -> cao trào -> khoảng thở, rồi tiếp tục vòng lặp"],
  ["恐怖源头过早完全暴露（未知才恐怖）", "Nguồn gốc kinh dị bị phơi bày hoàn toàn quá sớm; điều chưa biết mới tạo sợ hãi"],
  ["主角无脑刚正面解决一切", "Nhân vật chính lao thẳng chính diện thiếu suy nghĩ để giải quyết mọi thứ"],
  ["用打脸/升级等爽文套路替代恐怖氛围", "Dùng mô-típ sảng văn như vả mặt/nâng cấp để thay thế không khí kinh dị"],
  ["恐怖元素与日常场景割裂（好的恐怖来自日常的扭曲）", "Yếu tố kinh dị tách rời đời thường; kinh dị tốt đến từ sự méo mó của cái quen thuộc"],
  ["角色面对恐怖事件完全不害怕", "Nhân vật đối mặt sự kiện kinh dị mà hoàn toàn không sợ"],
  ["用大量血腥描写替代心理恐惧", "Dùng quá nhiều máu me để thay thế nỗi sợ tâm lý"],
  ["第一层：不适感（微妙的错位、违和）", "Tầng 1: cảm giác khó chịu, lệch nhịp và sai sai rất nhẹ"],
  ["第二层：不安（确认有异常，但看不清全貌）", "Tầng 2: bất an, đã xác nhận có bất thường nhưng chưa thấy toàn cảnh"],
  ["第三层：恐惧（威胁明确化，逃生本能启动）", "Tầng 3: sợ hãi, mối đe dọa đã rõ và bản năng sinh tồn bật lên"],
  ["第四层：绝望（规则被打破，安全感彻底崩塌）", "Tầng 4: tuyệt vọng, quy tắc bị phá vỡ và cảm giác an toàn sụp đổ hoàn toàn"],
  ["不要跳过层级直达高潮，递进才有力量", "Đừng nhảy thẳng tới cao trào; sức mạnh nằm ở tiến trình tăng dần"],
  ["恐怖用事实传达，不用情绪标签。✗\"他感到一阵恐惧\" → ✓\"他后颈的汗毛一根根立起来\"", "Kinh dị nên truyền bằng sự kiện, không bằng nhãn cảm xúc. Sai: \"anh ta cảm thấy sợ\" -> Đúng: \"lông sau gáy anh ta dựng từng sợi\""],
  ["禁止过度解释恐怖。异常现象只需呈现，不需叙述者出来总结\"这一切都太不正常了\"", "Tránh giải thích nỗi sợ quá mức. Hiện tượng bất thường chỉ cần được trình hiện, không cần người kể kết luận \"mọi thứ quá bất thường\""],
  ["克制叙事：越恐怖越冷静。句子随恐惧升级而变短，但叙述者语气始终平稳", "Tự sự phải kiềm chế: càng kinh dị càng bình tĩnh. Câu ngắn dần khi nỗi sợ tăng, nhưng giọng kể vẫn ổn định"],
  ["被淘汰/伤害的配角必须有至少一个暗示其个人故事的细节（书包里的补习班收据、手机壳上的贴纸），让淘汰有重量", "Nhân vật phụ bị loại/bị hại phải có ít nhất một chi tiết gợi chuyện riêng như hóa đơn lớp học thêm trong cặp hoặc sticker trên ốp điện thoại, để cái chết có trọng lượng"],
  ["氛围是第一生产力。用五感细节（声音、气味、温度、触感）建立不安。", "Không khí là sức sản xuất đầu tiên. Dùng chi tiết năm giác quan như âm thanh, mùi, nhiệt độ và xúc giác để dựng bất an."],
  ["恐怖来自对未知的恐惧，信息揭示要克制。", "Kinh dị đến từ nỗi sợ cái chưa biết, nên tiết lộ thông tin phải tiết chế."],
  ["\"看不见的\"永远比\"看见的\"更可怕。", "\"Thứ không nhìn thấy\" luôn đáng sợ hơn \"thứ nhìn thấy\"."],
  ["角色的恐惧反应必须真实：颤抖、口干、思维混乱、判断力下降。", "Phản ứng sợ hãi của nhân vật phải thật: run rẩy, khô miệng, rối loạn suy nghĩ, giảm khả năng phán đoán."],
  ["求生本能驱动行为，不是英雄主义。", "Hành động được thúc đẩy bởi bản năng sinh tồn, không phải chủ nghĩa anh hùng."],
  ["每个安全区都是暂时的，喘息之后是更深的恐惧。", "Mọi vùng an toàn chỉ là tạm thời; sau khoảng thở là nỗi sợ sâu hơn."],
  ["恐怖世界有自己的规则，发现规则是生存的关键。", "Thế giới kinh dị có quy tắc riêng; phát hiện quy tắc là chìa khóa sống sót."],
  ["信息管理：读者知道的和角色知道的之间的差距制造悬念。", "Quản lý thông tin: khoảng cách giữa điều độc giả biết và điều nhân vật biết tạo ra hồi hộp."],
  ["日常的扭曲比凭空出现的怪物更恐怖。", "Sự méo mó của đời thường đáng sợ hơn quái vật xuất hiện vô cớ."],
  ["每3章必须打破一次已建立的模式（规则矛盾、可信来源说谎、安全区失效），避免机械重复。", "Cứ 3 chương phải phá một mô thức đã thiết lập như mâu thuẫn quy tắc, nguồn đáng tin nói dối hoặc vùng an toàn mất hiệu lực, để tránh lặp máy móc."],
  ["每2-3章有一个明确的进展或反馈", "Cứ 2-3 chương cần có một tiến triển hoặc phản hồi rõ ràng"],
  ["无逻辑的巧合推进剧情", "Trùng hợp vô lý đẩy cốt truyện"],
  ["配角降智配合主角", "Nhân vật phụ bị hạ trí để phối hợp với nhân vật chính"],
  ["无铺垫的高潮", "Cao trào không có chuẩn bị"],
  ["根据具体题材调整叙事重心。", "Điều chỉnh trọng tâm tự sự theo từng thể loại cụ thể."],
  ["保持因果逻辑链完整。", "Giữ chuỗi logic nhân quả hoàn chỉnh."],
  ["人物行为由动机驱动，不由剧情需要驱动。", "Hành vi nhân vật phải do động cơ thúc đẩy, không phải do nhu cầu cốt truyện."],
  ["每2-3章一个小回报：商业收益、人脉拓展、对手受挫、信息优势", "Cứ 2-3 chương có một phần thưởng nhỏ: lợi ích kinh doanh, mở rộng quan hệ, đối thủ gặp thất bại hoặc lợi thế thông tin"],
  ["无逻辑的商业奇迹（没有铺垫的暴富）", "Phép màu kinh doanh thiếu logic, làm giàu đột ngột không có chuẩn bị"],
  ["反派降智配合主角表演", "Phản diện bị hạ trí để phối hợp màn trình diễn của nhân vật chính"],
  ["无视现实法律和商业规则", "Phớt lờ pháp luật và quy tắc kinh doanh thực tế"],
  ["用\"一个电话搞定\"跳过具体操作过程", "Dùng \"một cuộc điện thoại là xong\" để bỏ qua quy trình thao tác cụ thể"],
  ["女性角色沦为花瓶或奖励", "Nhân vật nữ bị biến thành bình hoa hoặc phần thưởng"],
  ["混入玄幻/仙侠战力体系", "Lẫn hệ thống sức mạnh huyền huyễn/tiên hiệp"],
  ["涉及法律、政策、商业规则必须符合设定年代", "Nội dung liên quan pháp luật, chính sách và quy tắc kinh doanh phải hợp với thời đại được đặt ra"],
  ["金融操作、公司运营必须有基本可信度", "Thao tác tài chính và vận hành công ty phải có độ tin cậy cơ bản"],
  ["人物身份、职位、权限不能超出现实合理范围", "Thân phận, chức vụ và quyền hạn nhân vật không được vượt quá phạm vi hợp lý của hiện thực"],
  ["地名、机构名、行业术语必须准确", "Địa danh, tên tổ chức và thuật ngữ ngành phải chính xác"],
  ["物价、收入、生活水平符合时代设定", "Giá cả, thu nhập và mức sống phải phù hợp bối cảnh thời đại"],
  ["人物内心独白必须口语化、直觉化，禁止商业分析/博弈论术语渗入叙事", "Độc thoại nội tâm phải đời thường và trực giác; tránh để thuật ngữ phân tích kinh doanh/lý thuyết trò chơi tràn vào tự sự"],
  ["他迅速分析了当前的债务状况", "anh ta nhanh chóng phân tích tình trạng nợ hiện tại"],
  ["他把那叠皱巴巴的白条翻了三遍", "anh ta lật xấp giấy nợ nhàu nát ba lần"],
  ["信息落差就在这儿", "độ lệch thông tin nằm ở đây"],
  ["他们不知道的，他知道", "điều họ không biết, anh ta biết"],
  ["以这种人的性格，这时候不会撕破脸", "với tính cách kiểu này, lúc này sẽ không trở mặt"],
  ["直接写对方的行为反应", "viết trực tiếp phản ứng hành vi của đối phương"],
  ["法律/商业术语必须匹配设定年代的真实语感：2003年民间借条不会写\"逾期处置授权\"，而是\"到期没还，房子归乙方处理\"", "Thuật ngữ pháp lý/kinh doanh phải đúng cảm giác thời đại: giấy vay dân sự năm 2003 sẽ không viết \"ủy quyền xử lý quá hạn\", mà là \"đến hạn không trả thì nhà thuộc bên B xử lý\""],
  ["主角的判断通过行动和对话体现，不通过上帝视角的分析段落", "Phán đoán của nhân vật chính phải thể hiện qua hành động và đối thoại, không qua đoạn phân tích toàn tri"],
  ["以商战、社交博弈和信息差驱动剧情。", "Dẫn cốt truyện bằng thương chiến, đấu trí xã giao và chênh lệch thông tin."],
  ["权力来自人脉、资本、信息和制度位置，不来自武力。", "Quyền lực đến từ quan hệ, vốn, thông tin và vị trí trong hệ thống, không đến từ vũ lực."],
  ["冲突解决靠谈判、交易、威慑、法律手段和利益交换。", "Xung đột được giải bằng đàm phán, giao dịch, uy hiếp, công cụ pháp lý và trao đổi lợi ích."],
  ["钱权必须落地，通过物、势、地位变化和小人物反应兑现爽点。", "Tiền và quyền phải cụ thể hóa qua vật chất, thế lực, thay đổi địa vị và phản ứng của người nhỏ để tạo điểm sảng."],
  ["人物关系网是核心资产，每次社交互动都应有利益计算。", "Mạng quan hệ là tài sản cốt lõi; mỗi tương tác xã giao đều nên có tính toán lợi ích."],
  ["主角需要保留非功能性时刻：思考、犹豫、社交润滑。", "Nhân vật chính cần có khoảnh khắc phi chức năng: suy nghĩ, do dự, làm mềm quan hệ xã giao."],
  ["主角不是全知全能，必须在前5章内至少出现一次判断失误或信息偏差。", "Nhân vật chính không toàn tri toàn năng; trong 5 chương đầu phải có ít nhất một lần phán đoán sai hoặc lệch thông tin."],
  ["时代厚重感、人情债与制度摩擦是都市文的灵魂。", "Cảm giác thời đại, nợ ân tình và ma sát thể chế là linh hồn của truyện đô thị."],
  ["用场面、气味、动作、交易、压迫感切入，不要历史课件式开头。", "Mở bằng cảnh, mùi, hành động, giao dịch và áp lực; tránh kiểu mở đầu như bài giảng lịch sử."],
  ["嵌入1-2个时代锚点（物价、新闻事件、流行用语）增强年代沉浸感。", "Cài 1-2 mốc thời đại như giá cả, sự kiện tin tức hoặc từ ngữ thịnh hành để tăng cảm giác nhập vai thời kỳ."],
  ["三章内必有明确反馈：打脸、收益兑现、信息反转、地位变化", "Trong 3 chương phải có phản hồi rõ ràng: vả mặt, lợi ích được兑现, đảo chiều thông tin hoặc thay đổi địa vị"],
  ["主角为推剧情突然仁慈、犯蠢、讲武德", "Nhân vật chính bỗng nhân từ, ngốc nghếch hoặc nói võ đức chỉ để đẩy cốt truyện"],
  ["用\"暴涨\"\"海量\"跳过数值结算", "Dùng \"tăng vọt\" hoặc \"khổng lồ\" để bỏ qua kết toán chỉ số"],
  ["无铺垫的能力觉醒", "Thức tỉnh năng lực không có chuẩn bị"],
  ["反派像木桩一样排队送死", "Phản diện xếp hàng chịu chết như cọc gỗ"],
  ["无铺垫强行让退场角色回归", "Ép nhân vật đã rời sân quay lại mà không chuẩn bị"],
  ["在没有铺垫的情况下突然塞入新体系、新地图、新外挂解决问题", "Đột ngột nhét hệ thống mới, bản đồ mới hoặc外挂 mới để giải quyết vấn đề khi chưa chuẩn bị"],
  ["把所有章节都写成高爆裂战斗章", "Biến mọi chương thành chương chiến đấu bùng nổ cao"],
  ["拆解知识库反向污染正文，写成\"似曾相识\"的拼装文", "Để việc bóc tách kho tri thức làm ô nhiễm ngược chính văn, biến thành văn ghép có cảm giác đã từng thấy"],
  ["风格混入都市腔、科幻腔、游戏系统播报腔、轻小说吐槽腔", "Lẫn giọng đô thị, khoa học viễn tưởng, thông báo hệ thống game hoặc giọng châm chọc light novel"],
  ["设定不可吃书：前文确立的设定数值后文不可无升级过程地随意改变", "Thiết lập không được tự mâu thuẫn: chỉ số đã xác lập trước đó không được tùy tiện đổi khi chưa có quá trình nâng cấp"],
  ["金手指四维约束：", "Ràng buộc bốn chiều của bàn tay vàng:"],
  ["能力上限：必须设定明确的能力天花板，不可无限升级", "Giới hạn năng lực: phải có trần năng lực rõ ràng, không được nâng cấp vô hạn"],
  ["附加代价：使用伴随代价（寿命、体力、副作用），权衡利弊增强冲突", "Cái giá kèm theo: sử dụng phải trả giá như tuổi thọ, thể lực hoặc tác dụng phụ để tăng xung đột bằng cân nhắc lợi hại"],
  ["触发条件：激活与特定场景/事件关联，不可随时随地无条件使用", "Điều kiện kích hoạt: gắn với cảnh/sự kiện cụ thể, không được dùng vô điều kiện mọi lúc mọi nơi"],
  ["成长路径：随主角经历同步升级，解锁过程与剧情节点绑定", "Lộ trình trưởng thành: nâng cấp đồng bộ với trải nghiệm của nhân vật chính, quá trình mở khóa gắn với nút cốt truyện"],
  ["同质资源重复吞噬必须写明衰减，不得默认全额结算", "Nuốt lặp cùng loại tài nguyên phải ghi rõ suy giảm, không được mặc định tính đủ"],
  ["同质吞噬衰减公式：收益 = 基础值 × max(0.3, 1 - 0.15×(N-1))", "Công thức suy giảm khi nuốt cùng loại: lợi ích = giá trị cơ bản x max(0.3, 1 - 0.15 x (N-1))"],
  ["不要用\"暴涨\"\"海量\"\"难以估量\"跳过数值结算", "Đừng dùng \"tăng vọt\", \"khổng lồ\" hoặc \"khó ước lượng\" để bỏ qua kết toán chỉ số"],
  ["期初值从账本取（不凭记忆），增量逐笔列出并注明来源", "Giá trị đầu kỳ lấy từ sổ theo dõi, không dựa trí nhớ; phần tăng thêm liệt kê từng khoản và ghi nguồn"],
  ["消耗逐笔列出并注明用途，期末 = 期初 + 增量 - 消耗，不得跳步", "Phần tiêu hao liệt kê từng khoản và ghi mục đích; cuối kỳ = đầu kỳ + tăng thêm - tiêu hao, không được nhảy bước"],
  ["正文中出现的系统提示（如【气血值+X】）必须与POST_SETTLEMENT一致", "Thông báo hệ thống xuất hiện trong chính văn như [Khí huyết +X] phải khớp POST_SETTLEMENT"],
  ["若正文写了\"比A还高\"这类比较句，必须数值验证后再保留", "Nếu chính văn viết câu so sánh kiểu \"cao hơn A\", phải kiểm chứng bằng chỉ số rồi mới giữ"],
  ["数值连续性必须可追溯：同层级、同类型样本的增量不得无说明跨越一个数量级", "Tính liên tục chỉ số phải truy vết được: mức tăng của mẫu cùng cấp/cùng loại không được vượt cả bậc số lượng nếu không giải thích"],
  ["力量体系的量级感用体感传达，不用抽象数字。", "Cảm giác cấp bậc của hệ thống sức mạnh nên truyền qua cảm nhận cơ thể, không dùng số trừu tượng."],
  ["他的火元从12缕增加到24缕", "hỏa nguyên của anh ta tăng từ 12 luồng lên 24 luồng"],
  ["手臂比先前有力了，握拳时指骨发紧", "cánh tay mạnh hơn trước, khi nắm quyền các khớp tay căng lại"],
  ["同一高潮段（如吞火/突破/觉醒）中，同一意象域的渲染不超过两轮，第三轮必须切入新信息或新动作", "Trong cùng một đoạn cao trào như nuốt lửa/đột phá/thức tỉnh, cùng một trường hình ảnh không được lặp quá hai vòng; vòng ba phải chuyển sang thông tin hoặc hành động mới"],
  ["搜尸/清点/装备段落禁止清单式列举，必须带入角色判断或取舍：", "Đoạn lục xác/kiểm kê/trang bị không được liệt kê kiểu danh sách, phải đưa vào phán đoán hoặc lựa chọn của nhân vật:"],
  ["他翻出粗盐、水囊、黑面饼", "anh ta lục ra muối thô, túi nước và bánh mì đen"],
  ["水囊最值钱，剩下那点水比命轻不了多少", "túi nước đáng giá nhất, chút nước còn lại gần như không nhẹ hơn mạng sống"],
  ["以战斗和资源获取驱动剧情。主角行为由利益驱动，杀伐果断。", "Dẫn cốt truyện bằng chiến đấu và thu tài nguyên. Hành vi nhân vật chính do lợi ích thúc đẩy, sát phạt dứt khoát."],
  ["金手指/能力系统必须有限制：使用频率、范围限制或使用代价。", "Bàn tay vàng/hệ thống năng lực phải có giới hạn: tần suất, phạm vi hoặc cái giá sử dụng."],
  ["设定不可吃书：前文确立的数值后文不可无升级过程地随意改变。", "Thiết lập không được tự mâu thuẫn: chỉ số đã xác lập trước đó không được tự ý thay đổi nếu chưa có quá trình nâng cấp."],
  ["三章内应有明确反馈，但反馈可以是打脸、收益兑现、信息反转、地位变化，不限于杀人。", "Trong 3 chương nên có phản hồi rõ ràng, có thể là vả mặt, lợi ích được兑现, đảo chiều thông tin hoặc thay đổi địa vị, không chỉ giới hạn ở giết người."],
  ["涉及吞噬时，收益必须同时落到资源说明与具体增量，不能只写抽象提升。", "Khi liên quan đến nuốt hấp thu, lợi ích phải thể hiện ở mô tả tài nguyên và mức tăng cụ thể, không chỉ viết tăng trưởng trừu tượng."],
  ["小冲突尽快兑现反馈；不要把爽点无限后置。", "Xung đột nhỏ nên sớm兑现 phản hồi; đừng trì hoãn điểm sảng vô hạn."],
  ["核心对手必须有脑子，有试探、有误判、有反扑。", "Đối thủ cốt lõi phải có đầu óc, có thăm dò, phán đoán sai và phản kích."],
  ["可以留人、钓鱼、示弱、借刀杀人，但前提只能是利益更大，绝不能是心软。", "Có thể tha người, thả mồi, tỏ yếu hoặc mượn dao giết người, nhưng tiền đề chỉ có thể là lợi ích lớn hơn, tuyệt đối không phải mềm lòng."],
  ["用动作、伤势、声音、重量、冲击、温度来落地\"强\"，少用空泛判断。", "Dùng hành động, thương tích, âm thanh, trọng lượng, va chạm và nhiệt độ để thể hiện \"mạnh\", hạn chế phán đoán sáo rỗng."],
  ["每个场景至少推进一项：信息、地位、资源、伤亡、仇恨、境界。", "Mỗi cảnh ít nhất phải đẩy một mục: thông tin, địa vị, tài nguyên, thương vong, thù hận hoặc cảnh giới."],
  ["用\"大道无形\"\"天道感应\"跳过具体修炼过程", "Dùng \"Đại đạo vô hình\" hoặc \"Thiên đạo cảm ứng\" để bỏ qua quá trình tu luyện cụ thể"],
  ["风格混入都市腔、游戏系统播报腔", "Lẫn giọng đô thị hoặc giọng thông báo hệ thống game"],
  ["境界突破必须有积累过程：悟道、丹药、战斗领悟、机缘", "Đột phá cảnh giới phải có quá trình tích lũy: ngộ đạo, đan dược, lĩnh ngộ trong chiến đấu hoặc cơ duyên"],
  ["同质资源重复炼化必须写明衰减", "Luyện hóa lặp lại cùng loại tài nguyên phải ghi rõ mức suy giảm"],
  ["法宝体系分品级，使用有代价（灵力、寿元、因果）", "Hệ thống pháp bảo phải chia phẩm cấp, sử dụng phải có cái giá như linh lực, thọ nguyên hoặc nhân quả"],
  ["金手指/功法四维约束：", "Ràng buộc bốn chiều của bàn tay vàng/công pháp:"],
  ["能力上限：有明确的境界/品阶天花板", "Giới hạn năng lực: có trần cảnh giới/phẩm cấp rõ ràng"],
  ["附加代价：修炼/使用伴随代价（寿元、因果、心魔）", "Cái giá kèm theo: tu luyện/sử dụng phải trả giá như thọ nguyên, nhân quả hoặc tâm ma"],
  ["触发条件：突破/觉醒需要特定条件（悟道、机缘、天劫）", "Điều kiện kích hoạt: đột phá/thức tỉnh cần điều kiện cụ thể như ngộ đạo, cơ duyên hoặc thiên kiếp"],
  ["成长路径：功法随修为递进，不可跳阶获得", "Lộ trình trưởng thành: công pháp tiến dần theo tu vi, không được nhảy cấp để đạt được"],
  ["天道规则一旦设定不可违反，除非有明确的特殊机制", "Quy tắc Thiên đạo đã đặt ra thì không được vi phạm, trừ khi có cơ chế đặc biệt rõ ràng"],
  ["期初修为/资源从账本取，增量逐笔列出", "Tu vi/tài nguyên ban đầu phải lấy từ sổ theo dõi, phần tăng thêm phải liệt kê từng khoản"],
  ["跨大境界突破需要天劫或特殊条件", "Đột phá qua đại cảnh giới cần thiên kiếp hoặc điều kiện đặc biệt"],
  ["叙事指导", "Hướng dẫn tự sự"],
  ["修炼与悟道是叙事核心，但必须融入剧情而非独立说教。", "Tu luyện và ngộ đạo là lõi tự sự, nhưng phải hòa vào cốt truyện thay vì tách thành thuyết giảng."],
  ["悟道场景用五感描写，不用抽象哲理灌输。", "Cảnh ngộ đạo nên dùng mô tả năm giác quan, không nhồi triết lý trừu tượng."],
  ["仙侠世界的规则感要强：因果、天劫、气运都是叙事工具。", "Thế giới tiên hiệp phải có cảm giác quy tắc mạnh: nhân quả, thiên kiếp và khí vận đều là công cụ tự sự."],
  ["人情债与道义约束是仙侠特有的驱动力。", "Nợ ân tình và ràng buộc đạo nghĩa là động lực đặc trưng của tiên hiệp."],
  ["门派政治、宗门博弈是重要的布局手段。", "Chính trị môn phái và đấu trí tông môn là công cụ bố cục quan trọng."],
  ["战斗以法术、法宝、阵法为核心，注重空间感和规模感。", "Chiến đấu lấy pháp thuật, pháp bảo và trận pháp làm lõi, chú trọng cảm giác không gian và quy mô."],
  ["数值规则", "Quy tắc chỉ số"],
  ["语言铁律", "Kỷ luật ngôn ngữ"],
  ["年代与现实约束", "Ràng buộc thời đại và hiện thực"],
  ["恐惧层级", "Các tầng sợ hãi"],
  ["蝼蚁", "kiến hôi"],
  ["境界", "cảnh giới"],
  ["突破", "đột phá"],
  ["悟道", "ngộ đạo"],
  ["丹药", "đan dược"],
  ["机缘", "cơ duyên"],
  ["法宝", "pháp bảo"],
  ["灵力", "linh lực"],
  ["寿元", "thọ nguyên"],
  ["心魔", "tâm ma"],
  ["天劫", "thiên kiếp"],
  ["功法", "công pháp"],
  ["修为", "tu vi"],
  ["资源", "tài nguyên"],
  ["账本", "sổ theo dõi"],
  ["逐笔列出", "liệt kê từng khoản"],
  ["特殊机制", "cơ chế đặc biệt"],
  ["都市腔", "giọng đô thị"],
  ["游戏系统播报腔", "giọng thông báo hệ thống game"],
  ["规则感", "cảm giác quy tắc"],
  ["世界", "thế giới"],
  ["修炼", "tu luyện"],
  ["战斗", "chiến đấu"],
  ["宗门", "tông môn"],
  ["门派", "môn phái"],
  ["阵法", "trận pháp"],
  ["编辑", "Chỉnh sửa"],
  ["复制到项目", "Sao chép vào dự án"],
  ["章节类型", "Loại chương"],
  ["疲劳词", "Từ dễ lặp"],
  ["节奏规则", "Quy tắc nhịp truyện"],
  ["规则", "Quy tắc"],
  ["题材禁忌", "Điều cấm kỵ của thể loại"],
  ["修炼规则", "Quy tắc tu luyện"],
  ["战斗章", "Chương chiến đấu"],
  ["悟道章", "Chương ngộ đạo"],
  ["布局章", "Chương bố cục"],
  ["过渡章", "Chương chuyển tiếp"],
  ["回收章", "Chương thu hồi tuyến truyện"],
  ["冷笑", "cười lạnh"],
  ["蹙眉", "nhíu mày"],
  ["倒吸凉气", "hít sâu kinh ngạc"],
  ["瞳孔骤缩", "đồng tử co lại"],
  ["天道", "Thiên đạo"],
  ["大道", "Đại đạo"],
  ["因果", "nhân quả"],
  ["气运", "khí vận"],
  ["仿佛", "dường như"],
  ["不禁", "không khỏi"],
  ["宛如", "tựa như"],
  ["竟然", "vậy mà"],
  ["修炼/悟道与战斗交替，每3-5章一次小突破或关键收获", "Luân phiên tu luyện/ngộ đạo và chiến đấu; cứ 3-5 chương có một đột phá nhỏ hoặc thu hoạch then chốt"],
  ["主角为推剧情突然仁慈、犯蠢", "Nhân vật chính bỗng nhân từ hoặc ngốc nghếch chỉ để đẩy cốt truyện"],
  ["修为无铺垫跳跃式突破", "Cảnh giới tăng vọt mà không có nền tảng"],
  ["法宝凭空出现解决危机", "Pháp bảo xuất hiện vô cớ để giải nguy"],
  ["天道规则前后矛盾", "Quy tắc Thiên đạo mâu thuẫn trước sau"],
  ["用“大道无形”“天道感应”跳过具体修炼过程", "Dùng \"Đại đạo vô hình\" hoặc \"Thiên đạo cảm ứng\" để bỏ qua quá trình tu luyện cụ thể"],
  ["同质资源不写衰减默认全额结算", "Tài nguyên đồng loại không ghi suy giảm nhưng mặc định tính đủ hiệu quả"],
  ["风格混入", "Lẫn phong cách"],
  ["分析结果", "Kết quả phân tích"],
  ["平均句长", "Độ dài câu trung bình"],
  ["词汇多样性", "Độ đa dạng từ vựng"],
  ["平均段落长度", "Độ dài đoạn trung bình"],
  ["句长标准差", "Độ lệch chuẩn độ dài câu"],
  ["主要模式", "Mẫu chính"],
  ["导入到书籍", "Nhập vào sách"],
  ["选择书籍...", "Chọn sách..."],
  ["导入文风指南", "Nhập hướng dẫn văn phong"],
  ["åˆ†æžç»“æžœ", "Káº¿t quáº£ phÃ¢n tÃ­ch"],
  ["å¹³å‡å¥é•¿", "Äá»™ dÃ i cÃ¢u trung bÃ¬nh"],
  ["è¯æ±‡å¤šæ ·æ€§", "Äá»™ Ä‘a dáº¡ng tá»« vá»±ng"],
  ["å¹³å‡æ®µè½é•¿åº¦", "Äá»™ dÃ i Ä‘oáº¡n trung bÃ¬nh"],
  ["å¥é•¿æ ‡å‡†å·®", "Äá»™ lá»‡ch chuáº©n Ä‘á»™ dÃ i cÃ¢u"],
  ["ä¸»è¦æ¨¡å¼", "Máº«u chÃ­nh"],
  ["å¯¼å…¥åˆ°ä¹¦ç±", "Nháº­p vÃ o sÃ¡ch"],
  ["é€‰æ‹©ä¹¦ç±...", "Chá»n sÃ¡ch..."],
  ["å¯¼å…¥æ–‡é£ŽæŒ‡å—", "Nháº­p hÆ°á»›ng dáº«n vÄƒn phong"],
  ["360 智脑", "360 Zhinao"],
  ["点击「扫描市场」分析当前趋势和机会", "Bấm \"Quét thị trường\" để phân tích xu hướng và cơ hội hiện tại"],
  ["部分检查失败 — 请查看配置", "Một số kiểm tra thất bại - vui lòng xem lại cấu hình"],
  ["部分检查失败", "Một số kiểm tra thất bại"],
  ["当前趋势和机会", "xu hướng và cơ hội hiện tại"],
  ["请查看配置", "vui lòng xem lại cấu hình"],
  ["部分检查", "Một số kiểm tra"],
  ["点击", "Bấm"],
  ["来源名称", "Tên nguồn"],
  ["如：参考小说", "Ví dụ: tiểu thuyết tham khảo"],
  ["文本样本", "Mẫu văn bản"],
  ["粘贴参考文本进行文风分析", "Dán văn bản tham khảo để phân tích văn phong"],
  ["粘贴文本并点击分析查看文风档案", "Dán văn bản và bấm Phân tích để xem hồ sơ văn phong"],
  ["分析", "Phân tích"],
  ["文风分析", "Phân tích văn phong"],
  ["刷新", "Làm mới"],
  ["暂无日志", "Chưa có nhật ký"],
  ["当前展示最近日志记录。", "Đang hiển thị các bản ghi nhật ký gần đây."],
  ["服务商管理", "Quản lý nhà cung cấp"],
  ["搜索服务商", "Tìm nhà cung cấp"],
  ["全部", "Tất cả"],
  ["海外原厂", "Nhà cung cấp quốc tế"],
  ["海外", "Quốc tế"],
  ["国产原厂", "Nhà cung cấp nội địa"],
  ["国产", "Nội địa"],
  ["聚合 API", "API tổng hợp"],
  ["聚合", "Tổng hợp"],
  ["本地 / 订阅", "Cục bộ / Đăng ký"],
  ["本地", "Cục bộ"],
  ["只看已连接", "Chỉ xem đã kết nối"],
  ["未配置", "Chưa cấu hình"],
  ["模型/价格", "Model / Giá"],
  ["模型", "Model"],
  ["官网", "Trang chủ"],
  ["文档", "Tài liệu"],
  ["API 文档", "Tài liệu API"],
  ["自定义服务", "Dịch vụ tuỳ chỉnh"],
  ["百炼 (通义千问)", "Bailian (Qwen)"],
  ["文心一言 (千帆)", "Wenxin Yiyan (Qianfan)"],
  ["火山引擎 (豆包)", "Volcengine (Doubao)"],
  ["腾讯混元", "Tencent Hunyuan"],
  ["腾讯云 (lkeap)", "Tencent Cloud (lkeap)"],
  ["智谱 GLM", "Zhipu GLM"],
  ["书生浦语 (InternLM)", "InternLM"],
  ["讯飞星火", "iFlytek Spark"],
  ["讯飞星辰 Astron Coding Plan", "iFlytek Astron Coding Plan"],
  ["阶跃星辰", "StepFun"],
  ["零一万物 (01.AI)", "01.AI"],
  ["百川智能", "Baichuan AI"],
  ["商汤日日新", "SenseTime Ririxin"],
  ["无问芯穹 InfiniAI", "InfiniAI"],
  ["硅基流动", "SiliconFlow"],
  ["美团 LongCat", "Meituan LongCat"],
  ["小米 MiMo", "Xiaomi MiMo"],
  ["七牛云 AI", "Qiniu Cloud AI"],
  ["魔搭社区 ModelScope", "ModelScope"],
  ["火山 Coding Plan", "Volcengine Coding Plan"],
  ["百炼 Coding Plan", "Bailian Coding Plan"],
  ["Ollama (本地)", "Ollama (cục bộ)"],
  ["New API (中转网关)", "New API (cổng trung chuyển)"],
  ["创建新题材", "Tạo thể loại mới"],
  ["选择题材查看详情", "Chọn thể loại để xem chi tiết"],
  ["通用", "Chung"],
  ["玄幻", "Huyền huyễn"],
  ["都市", "Đô thị"],
  ["仙侠", "Tiên hiệp"],
  ["恐怖", "Kinh dị"],
  ["导入工具", "Công cụ nhập dữ liệu"],
  ["导入章节", "Nhập chương"],
  ["导入母本", "Nhập bản gốc"],
  ["同人创作", "Sáng tác fanfic"],
  ["选择目标书籍", "Chọn sách đích"],
  ["分割正则（可选）", "Regex tách chương (tuỳ chọn)"],
  ["粘贴章节文本", "Dán văn bản chương"],
  ["扫描市场", "Quét thị trường"],
  ["点击「扫描市场」分析当前趋势和机会", "Bấm \"Quét thị trường\" để phân tích xu hướng và cơ hội hiện tại"],
  ["LLM API 连接", "Kết nối LLM API"],
  ["inkos.json 配置", "Cấu hình inkos.json"],
  ["书籍目录", "Thư mục sách"],
  ["全局 ~/.inkos/.env", "File toàn cục ~/.inkos/.env"],
  ["项目 .env 文件", "File .env của dự án"],
  ["失败", "Thất bại"],
  ["部分检查失败 — 请查看配置", "Một số kiểm tra thất bại - vui lòng xem lại cấu hình"],
  ["重新检查", "Kiểm tra lại"],
  ["告诉我你想写什么", "Hãy cho tôi biết bạn muốn viết gì - thể loại, thế giới quan, nhân vật chính và xung đột cốt lõi"],
  ["题材、世界观、主角、核心冲突", "Hãy cho tôi biết bạn muốn viết gì - thể loại, thế giới quan, nhân vật chính và xung đột cốt lõi"],
  ["输入指令", "Nhập chỉ lệnh..."],
  ["配置模型", "Cấu hình model →"],
] as const;

function hasChineseText(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function translateStudioText(text: string) {
  const exact = studioViText[text];

  if (exact) {
    return exact;
  }

  let translated = text;
  let changed = false;

  for (const item of [...studioViPartialText].sort((left, right) => right[0].length - left[0].length)) {
    const [source, target] = item;

    if (translated.includes(source)) {
      translated = translated.split(source).join(target);
      changed = true;
    }
  }

  return changed ? translated : undefined;
}

const shellCopy = {
  en: {
    back: "Back to MrNine home",
    kicker: "MrNine / InkOS Studio",
    title: "Story Forge",
    reload: "Reload",
    starting: "Starting InkOS Studio...",
    ready: "InkOS Studio is ready.",
    loadingHint: "This page keeps InkOS features intact and applies the MrNine visual shell around the studio.",
    errorTitle: "InkOS Studio failed to start",
    errorBody: "Check the InkOS Studio process or reload the page.",
  },
  vi: {
    back: "Quay lại MrNine",
    kicker: "MrNine / InkOS Studio",
    title: "Story Forge",
    reload: "Tải lại",
    starting: "Đang khởi động InkOS Studio...",
    ready: "InkOS Studio đã sẵn sàng.",
    loadingHint: "Trang này giữ nguyên tính năng InkOS và chỉ áp dụng lớp giao diện MrNine.",
    errorTitle: "Không thể khởi động InkOS Studio",
    errorBody: "Vui lòng kiểm tra tiến trình InkOS Studio hoặc tải lại trang.",
  },
} satisfies Record<WebLanguage, Record<string, string>>;

export function StoryForgeStudioShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialStudioSyncRef = useRef(false);
  const [state, setState] = useState<StudioState>("starting");
  const { language, setLanguage } = useLanguage();
  const copy = shellCopy[language];

  const syncStudioLanguage = useCallback(async (nextLanguage: WebLanguage) => {
    const studioLanguage = nextLanguage === "vi" ? "zh" : "en";

    try {
      await fetch("/api/v1/project", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: studioLanguage }),
      });
      await fetch("/api/v1/project/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: studioLanguage }),
      });
    } catch {
      // Studio language sync is best-effort; the iframe still exposes its native controls.
    }
  }, []);

  const updateLanguage = useCallback((nextLanguage: WebLanguage) => {
    setLanguage(nextLanguage);

    if (state !== "ready") {
      return;
    }

    void syncStudioLanguage(nextLanguage).finally(() => {
      window.setTimeout(() => iframeRef.current?.contentWindow?.location.reload(), 150);
    });
  }, [setLanguage, state, syncStudioLanguage]);

  const injectTheme = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;

    if (!doc) {
      return;
    }

    doc.documentElement.classList.add("dark");

    let style = doc.getElementById("webai-inkos-theme") as HTMLStyleElement | null;

    if (!style) {
      style = doc.createElement("style");
      style.id = "webai-inkos-theme";
      doc.head.appendChild(style);
    }

    style.textContent = `
      :root {
        color-scheme: dark;
        --background: 12 10 8;
        --foreground: 244 234 220;
        --card: 18 15 12;
        --card-foreground: 244 234 220;
        --popover: 16 13 11;
        --popover-foreground: 244 234 220;
        --primary: 239 68 68;
        --primary-foreground: 255 245 235;
        --secondary: 27 22 18;
        --secondary-foreground: 231 222 212;
        --muted: 30 25 20;
        --muted-foreground: 151 140 128;
        --accent: 69 168 93;
        --accent-foreground: 4 16 9;
        --destructive: 239 68 68;
        --destructive-foreground: 255 245 235;
        --border: 48 39 32;
        --input: 48 39 32;
        --ring: 239 68 68;
        --radius: 0.5rem;
      }

      html,
      body,
      #root {
        background:
          radial-gradient(circle at 18% 10%, rgba(69, 168, 93, 0.16), transparent 32rem),
          radial-gradient(circle at 88% 0%, rgba(239, 68, 68, 0.12), transparent 28rem),
          #0b0a08 !important;
        color: #f4eadc !important;
      }

      body {
        letter-spacing: 0;
      }

      a,
      button {
        transition-duration: 160ms !important;
      }

      aside,
      header,
      [class*="bg-card"],
      [class*="bg-background"] {
        background-color: rgba(12, 11, 9, 0.84) !important;
        border-color: rgba(239, 68, 68, 0.16) !important;
      }

      button[class*="bg-primary"],
      [class*="bg-primary"] {
        background-color: #ef4444 !important;
        color: #fff5eb !important;
      }

      [class*="rounded-xl"],
      [class*="rounded-2xl"] {
        border-radius: 0.5rem !important;
      }

      [class*="text-muted-foreground"] {
        color: #9a9187 !important;
      }

      textarea,
      input,
      select {
        background-color: rgba(20, 16, 13, 0.94) !important;
        border-color: rgba(69, 168, 93, 0.24) !important;
        color: #f4eadc !important;
      }
    `;

    const shouldTranslate = language === "vi";
    const translateValue = (value: string | null) => {
      const text = value?.trim();

      if (!text || !shouldTranslate || !hasChineseText(text)) {
        return undefined;
      }

      return translateStudioText(text);
    };

    const translateTextNode = (node: Text) => {
      const current = node.nodeValue;
      const text = current?.trim();

      if (!current || !text) {
        return;
      }

      const translated = translateValue(text);

      if (translated && translated !== text) {
        node.nodeValue = current.replace(text, translated);
      }
    };

    const translateStudioLabels = () => {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let currentNode = walker.nextNode();

      while (currentNode) {
        translateTextNode(currentNode as Text);
        currentNode = walker.nextNode();
      }

      const textElements = doc.querySelectorAll("button, span, div, label, p, h1, h2, h3, h4, a");

      for (const element of Array.from(textElements)) {
        if (element.childNodes.length !== 1 || element.firstChild?.nodeType !== Node.TEXT_NODE) {
          continue;
        }

        const text = element.textContent?.trim();

        if (!text) {
          continue;
        }

        const translated = translateValue(text);

        if (translated) {
          element.textContent = translated;
        }
      }

      const attributeElements = doc.querySelectorAll("input, textarea, button, [title], [aria-label]");

      for (const element of Array.from(attributeElements)) {
        for (const attribute of ["placeholder", "title", "aria-label"]) {
          const translated = translateValue(element.getAttribute(attribute));

          if (translated) {
            element.setAttribute(attribute, translated);
          }
        }
      }

      for (const button of Array.from(doc.querySelectorAll("button"))) {
        const text = button.textContent?.trim();

        if (text === "中" || text === "EN" || text === "VI") {
          const group = button.parentElement;
          if (group && group.querySelectorAll("button").length <= 3) {
            group.setAttribute("aria-hidden", "true");
            group.setAttribute("data-webai-hidden-language-switch", "true");
            group.setAttribute("style", "display: none !important;");
          }
        }
      }
    };

    translateStudioLabels();

    const interval = window.setInterval(translateStudioLabels, 500);
    const observer = new MutationObserver(() => translateStudioLabels());

    observer.observe(doc.body, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    window.setTimeout(() => window.clearInterval(interval), 15_000);

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    let poll: number | undefined;

    async function startStudio() {
      setState("starting");

      try {
        const response = await fetch("/api/story-forge/studio/start", { method: "POST" });
        const data = await response.json() as { ok?: boolean; message?: string };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "InkOS Studio failed to start.");
        }

        poll = window.setInterval(async () => {
          const statusResponse = await fetch("/api/story-forge/studio/start", { cache: "no-store" });
          const status = await statusResponse.json() as { ok?: boolean };

          if (!cancelled && status.ok) {
            window.clearInterval(poll);
            setState("ready");
          }
        }, 900);
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    void startStudio();

    return () => {
      cancelled = true;
      if (poll) {
        window.clearInterval(poll);
      }
    };
  }, []);

  useEffect(() => {
    if (state === "ready" && !initialStudioSyncRef.current) {
      initialStudioSyncRef.current = true;
      void syncStudioLanguage(language).finally(() => {
        window.setTimeout(() => iframeRef.current?.contentWindow?.location.reload(), 150);
      });
    }
  }, [language, state, syncStudioLanguage]);

  return (
    <main className="relative h-screen overflow-hidden bg-[#0b0a08] text-[#f4eadc]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(69,168,93,0.16),transparent_28rem),radial-gradient(circle_at_86%_6%,rgba(239,68,68,0.12),transparent_30rem)]" />
      <div className="relative z-10 flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#ef4444]/14 bg-[#0b0a08]/88 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label={copy.back}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#a79d91] transition hover:border-[#ef4444]/40 hover:text-[#f4eadc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <Link
              href="/"
              aria-label="MrNine home"
              className="flex min-w-0 items-center gap-3 rounded-md outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#45a85d]/70"
            >
              <div className="hidden size-9 items-center justify-center rounded-md border border-[#45a85d]/30 bg-[#45a85d]/10 text-[#45a85d] sm:flex">
                <PenLine className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#45a85d]">
                  {copy.kicker}
                </p>
                <h1 className="truncate text-lg font-black tracking-[-0.04em] text-[#f4eadc]">
                  {copy.title}
                </h1>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 font-mono text-[0.58rem] uppercase tracking-[0.16em]">
              {appLanguageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.title}
                  aria-pressed={language === option.value}
                  onClick={() => updateLanguage(option.value)}
                  className={`rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/70 ${
                    language === option.value
                      ? "bg-[#ef4444] text-white shadow-[0_0_18px_rgba(239,68,68,0.35)]"
                      : "text-[#9f968b] hover:text-[#f4eadc]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => iframeRef.current?.contentWindow?.location.reload()}
              className="h-9 rounded-md border-white/10 bg-white/[0.03] px-3 text-[#cfc4b8] hover:bg-white/[0.06]"
            >
              <RefreshCw className="size-4" />
              <span className="hidden sm:inline">{copy.reload}</span>
            </Button>
          </div>
        </header>

        <section className="relative min-h-0 flex-1">
          {state !== "ready" ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b0a08]">
              <div className="w-full max-w-sm rounded-lg border border-[#ef4444]/18 bg-[#11100d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3">
                  <Loader2 className="size-5 animate-spin text-[#ef4444]" />
                  <div>
                    <p className="text-sm font-bold text-[#f4eadc]">
                      {state === "starting" ? copy.starting : copy.ready}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#9a9187]">
                      {copy.loadingHint}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b0a08] p-4">
              <div className="max-w-md rounded-lg border border-[#ef4444]/24 bg-[#21100f] p-5 text-[#ffd8d3]">
                <h2 className="text-base font-black text-[#fff5eb]">{copy.errorTitle}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {copy.errorBody}
                </p>
              </div>
            </div>
          ) : null}

          <iframe
            ref={iframeRef}
            title="InkOS Story Forge Studio"
            src={state === "ready" ? STUDIO_URL : "about:blank"}
            onLoad={injectTheme}
            className="h-full w-full border-0 bg-[#0b0a08]"
          />
        </section>
      </div>
    </main>
  );
}
