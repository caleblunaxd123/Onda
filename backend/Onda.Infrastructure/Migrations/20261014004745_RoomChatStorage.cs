using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onda.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RoomChatStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RoomChatEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", maxLength: 32000, nullable: false),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomChatEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomChatEntries_ListeningRooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "ListeningRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoomUploads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UploaderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Mime = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Length = table.Column<long>(type: "bigint", nullable: false),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomUploads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RoomUploads_ListeningRooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "ListeningRooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoomChatEntries_RoomId_At",
                table: "RoomChatEntries",
                columns: new[] { "RoomId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_RoomChatEntries_SenderId",
                table: "RoomChatEntries",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_RoomUploads_RoomId_At",
                table: "RoomUploads",
                columns: new[] { "RoomId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_RoomUploads_UploaderId",
                table: "RoomUploads",
                column: "UploaderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoomChatEntries");

            migrationBuilder.DropTable(
                name: "RoomUploads");
        }
    }
}
