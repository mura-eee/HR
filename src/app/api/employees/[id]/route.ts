import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// GET /api/employees/[id] - Get single employee with relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, name: true, level: true } },
        jobType: { select: { id: true, name: true } },
        qualifications: {
          include: {
            qualification: true,
          },
          orderBy: { acquiredDate: "desc" },
        },
        evaluations: {
          orderBy: { createdAt: "desc" },
          include: {
            period: { select: { name: true } },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "社員が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("社員詳細取得エラー:", error);
    return NextResponse.json(
      { error: "社員情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if employee exists
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "社員が見つかりません" },
        { status: 404 }
      );
    }

    const {
      employeeCode,
      lastName,
      firstName,
      lastNameKana,
      firstNameKana,
      email,
      phone,
      hireDate,
      birthDate,
      gender,
      address,
      companyId,
      departmentId,
      positionId,
      jobTypeId,
      grade,
      salaryStep,
      baseSalary,
      qualificationAllowance,
      positionAllowance,
      otherAllowance1Name,
      otherAllowance1Amount,
      otherAllowance2Name,
      otherAllowance2Amount,
      otherAllowance3Name,
      otherAllowance3Amount,
      // 社会保険
      healthInsuranceNumber,
      healthInsuranceAcquiredDate,
      healthInsuranceLostDate,
      pensionInsuranceNumber,
      pensionAcquiredDate,
      pensionLostDate,
      basicPensionNumber,
      employmentInsuranceAcquiredDate,
      employmentInsuranceLostDate,
      employmentInsuranceNumber,
      // その他
      bloodType,
      // 緊急連絡先
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      emergencyContactAddress,
      profileImage,
      isActive,
    } = body;

    // Validate required fields
    if (!employeeCode || !lastName || !firstName || !email) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    // Check for duplicate employee code (exclude self)
    const duplicateCode = await prisma.employee.findFirst({
      where: { employeeCode, NOT: { id } },
    });
    if (duplicateCode) {
      return NextResponse.json(
        { error: "この社員コードは既に使用されています" },
        { status: 400 }
      );
    }

    // Check for duplicate email (exclude self)
    const duplicateEmail = await prisma.employee.findFirst({
      where: { email, NOT: { id } },
    });
    if (duplicateEmail) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeCode,
        lastName,
        firstName,
        lastNameKana: lastNameKana || null,
        firstNameKana: firstNameKana || null,
        email,
        phone: phone || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        address: address || null,
        companyId: companyId || null,
        departmentId: departmentId || null,
        positionId: positionId || null,
        jobTypeId: jobTypeId || null,
        grade: grade !== undefined && grade !== "" ? parseInt(grade, 10) : existing.grade,
        salaryStep:
          salaryStep !== undefined && salaryStep !== ""
            ? parseInt(salaryStep, 10)
            : existing.salaryStep,
        baseSalary:
          baseSalary !== undefined && baseSalary !== ""
            ? parseInt(baseSalary, 10)
            : existing.baseSalary,
        qualificationAllowance:
          qualificationAllowance !== undefined && qualificationAllowance !== ""
            ? parseInt(qualificationAllowance, 10)
            : existing.qualificationAllowance,
        positionAllowance:
          positionAllowance !== undefined && positionAllowance !== ""
            ? parseInt(positionAllowance, 10)
            : existing.positionAllowance,
        otherAllowance1Name: otherAllowance1Name ?? existing.otherAllowance1Name,
        otherAllowance1Amount:
          otherAllowance1Amount !== undefined && otherAllowance1Amount !== ""
            ? parseInt(otherAllowance1Amount, 10)
            : existing.otherAllowance1Amount,
        otherAllowance2Name: otherAllowance2Name ?? existing.otherAllowance2Name,
        otherAllowance2Amount:
          otherAllowance2Amount !== undefined && otherAllowance2Amount !== ""
            ? parseInt(otherAllowance2Amount, 10)
            : existing.otherAllowance2Amount,
        otherAllowance3Name: otherAllowance3Name ?? existing.otherAllowance3Name,
        otherAllowance3Amount:
          otherAllowance3Amount !== undefined && otherAllowance3Amount !== ""
            ? parseInt(otherAllowance3Amount, 10)
            : existing.otherAllowance3Amount,
        // 社会保険
        healthInsuranceNumber: healthInsuranceNumber ?? existing.healthInsuranceNumber,
        healthInsuranceAcquiredDate: healthInsuranceAcquiredDate ? new Date(healthInsuranceAcquiredDate) : existing.healthInsuranceAcquiredDate,
        healthInsuranceLostDate: healthInsuranceLostDate ? new Date(healthInsuranceLostDate) : (healthInsuranceLostDate === "" ? null : existing.healthInsuranceLostDate),
        pensionInsuranceNumber: pensionInsuranceNumber ?? existing.pensionInsuranceNumber,
        pensionAcquiredDate: pensionAcquiredDate ? new Date(pensionAcquiredDate) : existing.pensionAcquiredDate,
        pensionLostDate: pensionLostDate ? new Date(pensionLostDate) : (pensionLostDate === "" ? null : existing.pensionLostDate),
        basicPensionNumber: basicPensionNumber ?? existing.basicPensionNumber,
        employmentInsuranceAcquiredDate: employmentInsuranceAcquiredDate ? new Date(employmentInsuranceAcquiredDate) : existing.employmentInsuranceAcquiredDate,
        employmentInsuranceLostDate: employmentInsuranceLostDate ? new Date(employmentInsuranceLostDate) : (employmentInsuranceLostDate === "" ? null : existing.employmentInsuranceLostDate),
        employmentInsuranceNumber: employmentInsuranceNumber ?? existing.employmentInsuranceNumber,
        // その他
        bloodType: bloodType ?? existing.bloodType,
        // 緊急連絡先
        emergencyContactName: emergencyContactName ?? existing.emergencyContactName,
        emergencyContactRelationship: emergencyContactRelationship ?? existing.emergencyContactRelationship,
        emergencyContactPhone: emergencyContactPhone ?? existing.emergencyContactPhone,
        emergencyContactAddress: emergencyContactAddress ?? existing.emergencyContactAddress,
        profileImage: profileImage || null,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, name: true, level: true } },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("社員更新エラー:", error);
    return NextResponse.json(
      { error: "社員情報の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - Soft delete (set isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;

    // Check if employee exists
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "社員が見つかりません" },
        { status: 404 }
      );
    }

    // Soft delete - set isActive to false
    await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "社員を無効化しました" });
  } catch (error) {
    console.error("社員削除エラー:", error);
    return NextResponse.json(
      { error: "社員の無効化に失敗しました" },
      { status: 500 }
    );
  }
}
