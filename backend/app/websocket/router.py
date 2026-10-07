from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.websocket.manager import manager
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    payload = auth_service.verify_token(token)

    if not payload:
        await websocket.close(code=1008)
        return

    user_id = int(payload.get("sub"))
    user_service = UserService(db)
    message_service = MessageService(db)
    conversation_service = ConversationService(db)

    await manager.connect(websocket, user_id)
    user_service.set_online_status(user_id, True)
    await manager.broadcast_all({
        "event": "presence_update",
        "data": {"user_id": user_id, "status": "online"}
    })

    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")

            if event == "send_message":
                conversation_id = data.get("data", {}).get("conversation_id")
                content = data.get("data", {}).get("content")
                message_type = data.get("data", {}).get("message_type", "text")
                reply_to_id = data.get("data", {}).get("reply_to_id")
                temp_id = data.get("data", {}).get("temp_id")

                # Validate conversation membership
                if conversation_id and conversation_service.is_participant(conversation_id, user_id):
                    # Validate content
                    if content and content.strip():
                        # Create message with status "sending"
                        message = message_service.create_message(
                            conversation_id=conversation_id,
                            sender_id=user_id,
                            content=content.strip(),
                            message_type=message_type,
                            reply_to_id=reply_to_id
                        )

                        # Update status to "sent" after persistence
                        message_service.update_message_status(message["id"], "sent")

                        # Get full message data with status
                        message_data = message_service.get_message(message["id"])

                        # Broadcast to conversation subscribers
                        # Include temp_id only for the sender to match their optimistic update
                        broadcast_data = {
                            "event": "message_new",
                            "data": {
                                "message": message_data,
                                "conversation_id": conversation_id
                            }
                        }

                        # Add temp_id for sender to match their temp message
                        if temp_id:
                            broadcast_data["data"]["temp_id"] = temp_id

                        participant_ids = [
                            p["user_id"] for p in conversation_service.get_participants(conversation_id)
                        ]
                        await manager.send_to_users(broadcast_data, participant_ids)

                        for pid in participant_ids:
                            if pid != user_id and manager.is_user_online(pid):
                                delivered_ids = message_service.mark_messages_as_delivered(conversation_id, pid)
                                for msg_id in delivered_ids:
                                    await manager.send_to_users(
                                        {
                                            "event": "message_status",
                                            "data": {
                                                "message_id": msg_id,
                                                "status": "delivered",
                                                "user_id": pid
                                            }
                                        },
                                        participant_ids
                                    )

                        conversation_service.update_conversation(conversation_id, {})

            elif event == "typing_start":
                conversation_id = data.get("data", {}).get("conversation_id")
                if conversation_id and conversation_service.is_participant(conversation_id, user_id):
                    await manager.broadcast_to_conversation(
                        {
                            "event": "typing_start",
                            "data": {
                                "conversation_id": conversation_id,
                                "user_id": user_id
                            }
                        },
                        conversation_id
                    )

            elif event == "typing_stop":
                conversation_id = data.get("data", {}).get("conversation_id")
                if conversation_id and conversation_service.is_participant(conversation_id, user_id):
                    await manager.broadcast_to_conversation(
                        {
                            "event": "typing_stop",
                            "data": {
                                "conversation_id": conversation_id,
                                "user_id": user_id
                            }
                        },
                        conversation_id
                    )

            elif event == "subscribe_conversation":
                conversation_id = data.get("data", {}).get("conversation_id")
                if conversation_id and conversation_service.is_participant(conversation_id, user_id):
                    manager.subscribe_to_conversation(user_id, conversation_id)

                    # Mark incoming messages as delivered when user subscribes
                    delivered_ids = message_service.mark_messages_as_delivered(conversation_id, user_id)
                    for msg_id in delivered_ids:
                        msg_data = message_service.get_message(msg_id)
                        if msg_data:
                            await manager.broadcast_to_conversation(
                                {
                                    "event": "message_status",
                                    "data": {
                                        "message_id": msg_id,
                                        "status": "delivered",
                                        "user_id": user_id
                                    }
                                },
                                conversation_id
                            )

            elif event == "unsubscribe_conversation":
                conversation_id = data.get("data", {}).get("conversation_id")
                if conversation_id:
                    manager.unsubscribe_from_conversation(user_id, conversation_id)

            elif event == "mark_read":
                conversation_id = data.get("data", {}).get("conversation_id")
                if conversation_id and conversation_service.is_participant(conversation_id, user_id):
                    # Mark incoming messages as read
                    read_ids = message_service.mark_messages_as_read(conversation_id, user_id)

                    # Update participant's last read message
                    if read_ids:
                        last_msg_id = max(read_ids)
                        conversation_service.update_last_read_message(conversation_id, user_id, last_msg_id)

                    # Broadcast read status to conversation
                    for msg_id in read_ids:
                        await manager.broadcast_to_conversation(
                            {
                                "event": "message_status",
                                "data": {
                                    "message_id": msg_id,
                                    "status": "read",
                                    "user_id": user_id
                                }
                            },
                            conversation_id
                        )

            elif event == "presence_update":
                status = data.get("data", {}).get("status", "offline")
                user_service.set_online_status(user_id, status == "online")

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(user_id)
        user_service.set_online_status(user_id, False)
        user_service.update_last_seen(user_id)
        await manager.broadcast_all({
            "event": "presence_update",
            "data": {"user_id": user_id, "status": "offline"}
        })
