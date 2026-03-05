import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// GET /api/employees - List employees with search, filter, pagination, and sorting
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const departmentId = searchParams.get("departmentId") || "";
    const companyId = searchParams.get("companyId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const sortField = searchParams.get("sortField") || "employeeCode";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const isActive = searchParams.get("isActive");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { firstNameKana: { contains: search, mode: "insensitive" } },
        { lastNameKana: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    // Build orderBy
    const validSortFields = [
      "employeeCode",
      "lastName",
      "firstName",
      "hireDate",
      "grade",
      "baseSalary",
    ];
    const orderByField = validSortFields.includes(sortField)
      ? sortField
      : "employeeCode";
    const orderByDirection = sortOrder === "desc" ? "desc" : "asc";

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          department: { select: { id: true, name: true, code: true } },
          position: { select: { id: true, name: true, level: true } },
          jobType: { select: { id: true, name: true } },
        },
        orderBy: { [orderByField]: orderByDirection },
        skip,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json({
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("社員一覧取得エラー:", error);
    return NextResponse.json(
      { error: "社員一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create a new employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();

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
      departmentId,
      positionId,
      grade,
      salaryStep,
      baseSalary,
      profileImage,
    } = body;

    // Validate required fields
    if (!employeeCode || !lastName || !firstName || !email) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    // Check for duplicate employee code
    const existing = await prisma.employee.findFirst({
      where: { employeeCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: "この社員コードは既に使用されています" },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existingEmail = await prisma.employee.findFirst({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
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
        departmentId: departmentId || null,
        positionId: positionId || null,
        grade: grade ? parseInt(grade, 10) : 1,
        salaryStep: salaryStep ? parseInt(salaryStep, 10) : 1,
        baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
        profileImage: profileImage || null,
        isActive: true,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, name: true, level: true } },
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("社員登録エラー:", error);
    return NextResponse.json(
      { error: "社員の登録に失敗しました" },
      { status: 500 }
    );
  }
}
