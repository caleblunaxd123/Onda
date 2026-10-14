using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Onda.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PlaybackIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastPlaybackCommandHash",
                table: "ListeningRooms",
                type: "varchar(64)",
                unicode: false,
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastPlaybackEventId",
                table: "ListeningRooms",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastPlaybackSessionHash",
                table: "ListeningRooms",
                type: "varchar(64)",
                unicode: false,
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastPlaybackCommandHash",
                table: "ListeningRooms");

            migrationBuilder.DropColumn(
                name: "LastPlaybackEventId",
                table: "ListeningRooms");

            migrationBuilder.DropColumn(
                name: "LastPlaybackSessionHash",
                table: "ListeningRooms");
        }
    }
}
