from sqlalchemy import Column, Integer, String, ForeignKey
from .database import Base


class MasteryState(Base):
    __tablename__ = "mastery_state"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, nullable=False)
    subtopic_id = Column(Integer, nullable=False)
    mastery_score = Column(Integer, nullable=False)


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id = Column(Integer, primary_key=True)
    subtopic_id = Column(Integer, nullable=False)
    difficulty = Column(String, nullable=False)
    content_text = Column(String, nullable=False)
    hint_text = Column(String, nullable=True)


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    content_version_id = Column(Integer, nullable=False)
    question_text = Column(String, nullable=False)


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, nullable=False)
    subtopic_id = Column(Integer, nullable=False)
    mastery_score = Column(Integer, nullable=False)
    difficulty = Column(String, nullable=False)
    reason = Column(String, nullable=False)