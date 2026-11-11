import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ClassWrite, EnrollmentWrite, ParentLinkWrite, ParentWrite, ScheduleWrite, StudentWrite, TeacherAssignment, TeacherWrite } from '@wasli/validation';
import { classWriteSchema, enrollmentSchema, parentLinkSchema, parentWriteSchema, scheduleWriteSchema, studentWriteSchema, teacherAssignmentSchema, teacherWriteSchema } from '@wasli/validation';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ZodBodyPipe } from '../common/zod-body.pipe.js';
import { DirectoryService } from './directory.service.js';

@ApiTags('directory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get('summary')
  summary(@CurrentAuth() auth: AuthContext) {
    return this.directory.summary(auth);
  }

  @Get('students')
  students(@CurrentAuth() auth: AuthContext, @Query('q') q?: string, @Query('status') status?: string, @Query('classId') classId?: string) {
    return this.directory.students(auth, { q, status, classId });
  }

  @Post('students')
  createStudent(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(studentWriteSchema)) body: StudentWrite) {
    return this.directory.createStudent(auth, body);
  }

  @Get('students/:id')
  student(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.student(auth, id);
  }

  @Patch('students/:id')
  updateStudent(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodBodyPipe(studentWriteSchema)) body: StudentWrite) {
    return this.directory.updateStudent(auth, id, body);
  }

  @Delete('students/:id')
  archiveStudent(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.archiveStudent(auth, id);
  }

  @Get('parents')
  parents(@CurrentAuth() auth: AuthContext, @Query('q') q?: string) {
    return this.directory.parents(auth, q);
  }

  @Post('parents')
  createParent(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(parentWriteSchema)) body: ParentWrite) {
    return this.directory.createParent(auth, body);
  }

  @Patch('parents/:id')
  updateParent(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodBodyPipe(parentWriteSchema)) body: ParentWrite) {
    return this.directory.updateParent(auth, id, body);
  }

  @Post('parent-links')
  linkParent(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(parentLinkSchema)) body: ParentLinkWrite) {
    return this.directory.linkParent(auth, body);
  }

  @Delete('parent-links/:id')
  unlinkParent(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.unlinkParent(auth, id);
  }

  @Get('teachers')
  teachers(@CurrentAuth() auth: AuthContext, @Query('q') q?: string) {
    return this.directory.teachers(auth, q);
  }

  @Post('teachers')
  createTeacher(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(teacherWriteSchema)) body: TeacherWrite) {
    return this.directory.createTeacher(auth, body);
  }

  @Patch('teachers/:id')
  updateTeacher(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodBodyPipe(teacherWriteSchema)) body: TeacherWrite) {
    return this.directory.updateTeacher(auth, id, body);
  }

  @Post('teacher-classes')
  assignTeacher(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(teacherAssignmentSchema)) body: TeacherAssignment) {
    return this.directory.assignTeacher(auth, body.classId, body.teacherUserId);
  }

  @Delete('teacher-classes/:id')
  unassignTeacher(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.unassignTeacher(auth, id);
  }

  @Get('classes')
  classes(@CurrentAuth() auth: AuthContext, @Query('q') q?: string, @Query('status') status?: string) {
    return this.directory.classes(auth, { q, status });
  }

  @Post('classes')
  createClass(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(classWriteSchema)) body: ClassWrite) {
    return this.directory.createClass(auth, body);
  }

  @Patch('classes/:id')
  updateClass(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodBodyPipe(classWriteSchema)) body: ClassWrite) {
    return this.directory.updateClass(auth, id, body);
  }

  @Post('classes/:id/archive')
  archiveClass(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.archiveClass(auth, id);
  }

  @Post('enrollments')
  enroll(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(enrollmentSchema)) body: EnrollmentWrite) {
    return this.directory.enrollStudent(auth, body.classId, body.studentId);
  }

  @Delete('enrollments/:id')
  unenroll(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.unenroll(auth, id);
  }

  @Get('schedules')
  schedules(@CurrentAuth() auth: AuthContext) {
    return this.directory.schedules(auth);
  }

  @Post('schedules')
  createSchedule(@CurrentAuth() auth: AuthContext, @Body(new ZodBodyPipe(scheduleWriteSchema)) body: ScheduleWrite) {
    return this.directory.createSchedule(auth, body);
  }

  @Patch('schedules/:id')
  updateSchedule(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodBodyPipe(scheduleWriteSchema)) body: ScheduleWrite) {
    return this.directory.updateSchedule(auth, id, body);
  }

  @Delete('schedules/:id')
  deleteSchedule(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.directory.deleteSchedule(auth, id);
  }
}
