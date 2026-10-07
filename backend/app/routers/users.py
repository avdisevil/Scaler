from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.contact import ContactCreate, ContactResponse
from app.services.user_service import UserService
from app.repositories.contact_repository import ContactRepository
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_service = UserService(db)
    user = user_service.get_user(current_user["user_id"])

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_service = UserService(db)

    update_dict = update_data.model_dump(exclude_unset=True)
    user = user_service.update_user(current_user["user_id"], update_dict)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_service = UserService(db)
    users = user_service.search_users(q, current_user["user_id"])
    return users


@router.post("/contacts", response_model=ContactResponse)
def add_contact(
    contact_data: ContactCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_service = UserService(db)
    contact = user_service.add_contact(
        current_user["user_id"],
        contact_data.contact_user_id,
        contact_data.display_name
    )
    return contact


@router.get("/contacts", response_model=List[ContactResponse])
def get_contacts(
    q: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_service = UserService(db)
    contacts = user_service.get_contacts(current_user["user_id"], query=q)
    return contacts


@router.delete("/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact_repo = ContactRepository(db)
    contact = contact_repo.get_by_id(contact_id)

    if not contact or contact.user_id != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )

    contact_repo.delete(contact_id)
    return {"success": True}

