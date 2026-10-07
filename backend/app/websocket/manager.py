from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
        self.conversation_subscribers: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

        for conversation_id, subscribers in self.conversation_subscribers.items():
            if user_id in subscribers:
                subscribers.remove(user_id)

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)

    async def broadcast_to_conversation(self, message: dict, conversation_id: int):
        if conversation_id in self.conversation_subscribers:
            for user_id in list(self.conversation_subscribers[conversation_id]):
                await self.send_personal_message(message, user_id)

    async def send_to_users(self, message: dict, user_ids):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)

    async def broadcast_all(self, message: dict):
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)

    def subscribe_to_conversation(self, user_id: int, conversation_id: int):
        if conversation_id not in self.conversation_subscribers:
            self.conversation_subscribers[conversation_id] = set()
        self.conversation_subscribers[conversation_id].add(user_id)

    def unsubscribe_from_conversation(self, user_id: int, conversation_id: int):
        if conversation_id in self.conversation_subscribers:
            self.conversation_subscribers[conversation_id].discard(user_id)

    def get_online_users(self) -> Set[int]:
        return set(self.active_connections.keys())

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.active_connections


manager = ConnectionManager()
