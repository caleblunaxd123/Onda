using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onda.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SafetyBlocks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "MessageId",
                table: "CommunityReports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MessageSnapshot",
                table: "CommunityReports",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewNote",
                table: "CommunityReports",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReviewedAt",
                table: "CommunityReports",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReviewedBy",
                table: "CommunityReports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "CommunityReports",
                type: "varchar(16)",
                unicode: false,
                maxLength: 16,
                nullable: false,
                defaultValue: "received");

            migrationBuilder.CreateTable(
                name: "UserBlocks",
                columns: table => new
                {
                    BlockerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BlockedId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserBlocks", x => new { x.BlockerId, x.BlockedId });
                    table.ForeignKey(
                        name: "FK_UserBlocks_ListenerAccounts_BlockedId",
                        column: x => x.BlockedId,
                        principalTable: "ListenerAccounts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserBlocks_ListenerAccounts_BlockerId",
                        column: x => x.BlockerId,
                        principalTable: "ListenerAccounts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityReports_Status_CreatedAt",
                table: "CommunityReports",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserBlocks_BlockedId",
                table: "UserBlocks",
                column: "BlockedId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserBlocks");

            migrationBuilder.DropIndex(
                name: "IX_CommunityReports_Status_CreatedAt",
                table: "CommunityReports");

            migrationBuilder.DropColumn(
                name: "MessageId",
                table: "CommunityReports");

            migrationBuilder.DropColumn(
                name: "MessageSnapshot",
                table: "CommunityReports");

            migrationBuilder.DropColumn(
                name: "ReviewNote",
                table: "CommunityReports");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "CommunityReports");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "CommunityReports");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "CommunityReports");
        }
    }
}
