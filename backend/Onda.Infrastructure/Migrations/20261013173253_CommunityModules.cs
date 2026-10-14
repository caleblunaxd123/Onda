using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onda.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CommunityModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CommunityReports",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReporterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ListenerAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RecoveryHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    FailedLogins = table.Column<int>(type: "int", nullable: false),
                    LockedUntil = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListenerAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ListeningRooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(70)", maxLength: 70, nullable: false),
                    IsPrivate = table.Column<bool>(type: "bit", nullable: false),
                    InviteCode = table.Column<string>(type: "varchar(12)", unicode: false, maxLength: 12, nullable: false),
                    Media = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Queue = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsPlaying = table.Column<bool>(type: "bit", nullable: false),
                    PositionSeconds = table.Column<double>(type: "float", nullable: false),
                    PlaybackUpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Closed = table.Column<bool>(type: "bit", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListeningRooms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CloudLibraries",
                columns: table => new
                {
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudLibraries", x => x.AccountId);
                    table.ForeignKey(
                        name: "FK_CloudLibraries_ListenerAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "ListenerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ListenerSessions",
                columns: table => new
                {
                    TokenHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListenerSessions", x => x.TokenHash);
                    table.ForeignKey(
                        name: "FK_ListenerSessions_ListenerAccounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "ListenerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoomBans",
                columns: table => new
                {
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AccountId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomBans", x => new { x.RoomId, x.AccountId });
                    table.ForeignKey(
                        name: "FK_RoomBans_ListeningRooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "ListeningRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityReports_CreatedAt",
                table: "CommunityReports",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ListenerAccounts_Email",
                table: "ListenerAccounts",
                column: "Email",
                unique: true,
                filter: "[Email] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ListenerSessions_AccountId",
                table: "ListenerSessions",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_ListenerSessions_ExpiresAt",
                table: "ListenerSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_ListeningRooms_InviteCode",
                table: "ListeningRooms",
                column: "InviteCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ListeningRooms_IsPrivate_Closed_UpdatedAt",
                table: "ListeningRooms",
                columns: new[] { "IsPrivate", "Closed", "UpdatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CloudLibraries");

            migrationBuilder.DropTable(
                name: "CommunityReports");

            migrationBuilder.DropTable(
                name: "ListenerSessions");

            migrationBuilder.DropTable(
                name: "RoomBans");

            migrationBuilder.DropTable(
                name: "ListenerAccounts");

            migrationBuilder.DropTable(
                name: "ListeningRooms");
        }
    }
}
